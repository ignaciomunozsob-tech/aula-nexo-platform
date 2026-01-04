import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StudentEntry {
  name: string;
  email: string;
}

interface AddStudentsRequest {
  students: StudentEntry[];
  productId: string;
  productType: "course" | "ebook" | "event";
}

// Rate limit: max 20 students per hour per creator
const RATE_LIMIT_STUDENTS = 20;
const RATE_LIMIT_WINDOW_HOURS = 1;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Create client with user's JWT to verify identity
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized: Invalid token");
    }

    // Create admin client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user is a creator
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      throw new Error("Unable to verify user role");
    }

    if (profile.role !== "creator" && profile.role !== "admin") {
      throw new Error("Unauthorized: Only creators can add students");
    }

    const { students, productId, productType }: AddStudentsRequest = await req.json();

    // Validate input
    if (!students || !Array.isArray(students) || students.length === 0) {
      throw new Error("No students provided");
    }

    if (students.length > 10) {
      throw new Error("Maximum 10 students per request");
    }

    // Validate each student entry
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const student of students) {
      if (!student.name || student.name.trim().length < 2) {
        throw new Error(`Invalid name for student: ${student.email || 'unknown'}`);
      }
      if (!student.email || !emailRegex.test(student.email)) {
        throw new Error(`Invalid email: ${student.email || 'empty'}`);
      }
    }

    // Rate limiting check
    const oneHourAgo = new Date(Date.now() - RATE_LIMIT_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
    
    const { data: recentLogs, error: logsError } = await supabaseAdmin
      .from("student_creation_logs")
      .select("students_count")
      .eq("creator_id", user.id)
      .gte("created_at", oneHourAgo);

    if (!logsError && recentLogs) {
      const totalRecent = recentLogs.reduce((sum, log) => sum + (log.students_count || 0), 0);
      if (totalRecent + students.length > RATE_LIMIT_STUDENTS) {
        throw new Error(`Rate limit exceeded. You can add ${RATE_LIMIT_STUDENTS - totalRecent} more students this hour.`);
      }
    }

    // Verify product ownership
    if (productType === "course") {
      const { data: course, error: courseError } = await supabaseAdmin
        .from("courses")
        .select("creator_id")
        .eq("id", productId)
        .single();

      if (courseError || !course || course.creator_id !== user.id) {
        throw new Error("Unauthorized: You don't own this course");
      }
    } else if (productType === "event") {
      const { data: event, error: eventError } = await supabaseAdmin
        .from("events")
        .select("creator_id")
        .eq("id", productId)
        .single();

      if (eventError || !event || event.creator_id !== user.id) {
        throw new Error("Unauthorized: You don't own this event");
      }
    }

    const results: { email: string; success: boolean; message: string }[] = [];

    for (const student of students) {
      try {
        // Generate cryptographically secure password
        const randomBytes = crypto.getRandomValues(new Uint8Array(16));
        const tempPassword = Array.from(randomBytes, b => b.toString(16).padStart(2, '0')).join('').slice(0, 16) + "Aa1!";

        // Try to create user
        const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
          email: student.email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            name: student.name,
            needs_password_change: true,
          },
        });

        let userId: string;

        if (signUpError) {
          if (signUpError.message?.includes("already") || signUpError.message?.includes("exists")) {
            // User exists - try to find them
            const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
            const existingUser = existingUsers?.users?.find(u => u.email === student.email);
            
            if (existingUser) {
              userId = existingUser.id;
            } else {
              results.push({ email: student.email, success: false, message: "User exists but not found" });
              continue;
            }
          } else {
            throw signUpError;
          }
        } else {
          userId = signUpData.user!.id;
          
          // Send password reset email instead of sending password in plain text
          await supabaseAdmin.auth.resetPasswordForEmail(student.email, {
            redirectTo: `${Deno.env.get("SITE_URL") || "https://aulanexo.lovable.app"}/reset-password`,
          });
        }

        // Create enrollment/registration
        if (productType === "event") {
          const { error: regError } = await supabaseAdmin.from("event_registrations").insert({
            event_id: productId,
            user_id: userId,
            status: "registered",
          });
          if (regError && !regError.message?.includes("duplicate")) {
            results.push({ email: student.email, success: false, message: regError.message });
            continue;
          }
        } else {
          const { error: enrollError } = await supabaseAdmin.from("enrollments").insert({
            course_id: productId,
            user_id: userId,
            status: "active",
          });
          if (enrollError && !enrollError.message?.includes("duplicate")) {
            results.push({ email: student.email, success: false, message: enrollError.message });
            continue;
          }
        }

        results.push({ email: student.email, success: true, message: "Added successfully" });
      } catch (studentError: any) {
        console.error(`Error adding student ${student.email}:`, studentError);
        results.push({ email: student.email, success: false, message: studentError.message || "Unknown error" });
      }
    }

    // Log the creation for rate limiting
    const successCount = results.filter(r => r.success).length;
    if (successCount > 0) {
      await supabaseAdmin.from("student_creation_logs").insert({
        creator_id: user.id,
        students_count: successCount,
      });
    }

    console.log(`Added ${successCount}/${students.length} students for creator ${user.id}`);

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in add-students function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: error.message?.includes("Unauthorized") ? 401 : 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
