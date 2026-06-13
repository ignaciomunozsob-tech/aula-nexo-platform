import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StudentEntry { name: string; email: string }
interface AddStudentsRequest {
  students: StudentEntry[];
  productId: string;
  productType: "course" | "ebook" | "event";
}

const RATE_LIMIT_STUDENTS = 20;
const RATE_LIMIT_WINDOW_HOURS = 1;

async function findUserIdByEmail(
  supabaseAdmin: ReturnType<typeof createClient>,
  email: string,
): Promise<string | null> {
  // Paginate listUsers until we find the email (avoids 50-user cap bug).
  const perPage = 200;
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found.id;
    if (!data.users || data.users.length < perPage) return null;
  }
  return null;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized: Invalid token");

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profileError || !profile) throw new Error("Unable to verify user role");

    const isAdmin = profile.role === "admin";
    if (!isAdmin && profile.role !== "creator") {
      throw new Error("Unauthorized: Only creators can add students");
    }

    const body = (await req.json()) as AddStudentsRequest;
    const { students, productId, productType } = body;
    console.log("add-students invoked", { userId: user.id, productId, productType, count: students?.length });

    if (!students || !Array.isArray(students) || students.length === 0) {
      throw new Error("No students provided");
    }
    if (students.length > 10) throw new Error("Maximum 10 students per request");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const student of students) {
      if (!student.name || student.name.trim().length < 2) {
        throw new Error(`Invalid name for student: ${student.email || "unknown"}`);
      }
      if (!student.email || !emailRegex.test(student.email)) {
        throw new Error(`Invalid email: ${student.email || "empty"}`);
      }
    }

    // Rate limit
    const oneHourAgo = new Date(Date.now() - RATE_LIMIT_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
    const { data: recentLogs } = await supabaseAdmin
      .from("student_creation_logs")
      .select("students_count")
      .eq("creator_id", user.id)
      .gte("created_at", oneHourAgo);
    if (recentLogs) {
      const totalRecent = recentLogs.reduce((sum, log) => sum + (log.students_count || 0), 0);
      if (totalRecent + students.length > RATE_LIMIT_STUDENTS) {
        throw new Error(`Rate limit exceeded. You can add ${RATE_LIMIT_STUDENTS - totalRecent} more students this hour.`);
      }
    }

    // Ownership check (admins bypass)
    if (!isAdmin) {
      if (productType === "course") {
        const { data: course, error: courseError } = await supabaseAdmin
          .from("courses").select("creator_id").eq("id", productId).single();
        if (courseError || !course || course.creator_id !== user.id) {
          throw new Error("Unauthorized: You don't own this course");
        }
      } else if (productType === "event") {
        const { data: event, error: eventError } = await supabaseAdmin
          .from("events").select("creator_id").eq("id", productId).single();
        if (eventError || !event || event.creator_id !== user.id) {
          throw new Error("Unauthorized: You don't own this event");
        }
      } else if (productType === "ebook") {
        const { data: ebook, error: ebookError } = await supabaseAdmin
          .from("ebooks").select("creator_id").eq("id", productId).single();
        if (ebookError || !ebook || ebook.creator_id !== user.id) {
          throw new Error("Unauthorized: You don't own this ebook");
        }
      } else {
        throw new Error("Invalid product type");
      }
    }

    const results: { email: string; success: boolean; message: string }[] = [];

    for (const student of students) {
      const email = student.email.trim().toLowerCase();
      try {
        // Generate secure password (user resets via email)
        const randomBytes = crypto.getRandomValues(new Uint8Array(16));
        const tempPassword =
          Array.from(randomBytes, (b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16) + "Aa1!";

        let userId: string | null = null;

        const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { name: student.name, needs_password_change: true },
        });

        if (signUpError) {
          const msg = signUpError.message || "";
          const alreadyExists =
            msg.toLowerCase().includes("already") ||
            msg.toLowerCase().includes("registered") ||
            msg.toLowerCase().includes("exists") ||
            (signUpError as any).status === 422;

          if (alreadyExists) {
            userId = await findUserIdByEmail(supabaseAdmin, email);
            if (!userId) {
              results.push({ email, success: false, message: `Usuario ya existe pero no se pudo encontrar (${msg})` });
              continue;
            }
          } else {
            results.push({ email, success: false, message: msg });
            continue;
          }
        } else {
          userId = signUpData.user!.id;
          try {
            await supabaseAdmin.auth.resetPasswordForEmail(email, {
              redirectTo: `${Deno.env.get("SITE_URL") || "https://novuproject.lovable.app"}/#/reset-password`,
            });
          } catch (mailErr) {
            console.warn(`reset email failed for ${email}`, mailErr);
          }
        }

        if (productType === "event") {
          const { error: regError } = await supabaseAdmin.from("event_registrations").insert({
            event_id: productId, user_id: userId, status: "registered",
          });
          if (regError && !regError.message?.toLowerCase().includes("duplicate")) {
            results.push({ email, success: false, message: regError.message }); continue;
          }
        } else {
          const { error: enrollError } = await supabaseAdmin.from("enrollments").insert({
            course_id: productId, user_id: userId, status: "active",
          });
          if (enrollError && !enrollError.message?.toLowerCase().includes("duplicate")) {
            results.push({ email, success: false, message: enrollError.message }); continue;
          }
        }

        results.push({ email, success: true, message: "Added successfully" });
      } catch (studentError: any) {
        console.error(`Error adding student ${email}:`, studentError);
        results.push({ email, success: false, message: studentError.message || "Unknown error" });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    if (successCount > 0) {
      await supabaseAdmin.from("student_creation_logs").insert({
        creator_id: user.id, students_count: successCount,
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
      },
    );
  }
};

serve(handler);
