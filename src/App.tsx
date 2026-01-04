import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { StudentLayout } from "@/components/layout/StudentLayout";
import { CreatorLayout } from "@/components/layout/CreatorLayout";
import HomePage from "@/pages/HomePage";
import CoursesPage from "@/pages/CoursesPage";
import CourseDetailPage from "@/pages/CourseDetailPage";
import CreatorProfilePage from "@/pages/CreatorProfilePage";
import LoginPage from "@/pages/auth/LoginPage";
import SignupPage from "@/pages/auth/SignupPage";
import StudentDashboard from "@/pages/app/StudentDashboard";
import MyCoursesPage from "@/pages/app/MyCoursesPage";
import CoursePlayerPage from "@/pages/app/CoursePlayerPage";
import StudentSettings from "@/pages/app/StudentSettings";
import CreatorDashboard from "@/pages/creator/CreatorDashboard";
import CreatorProductsPage from "@/pages/creator/CreatorProductsPage";
import CourseEditorPage from "@/pages/creator/CourseEditorPage";
import EbookEditorPage from "@/pages/creator/EbookEditorPage";
import EventEditorPage from "@/pages/creator/EventEditorPage";
import CreatorProfileEdit from "@/pages/creator/CreatorProfileEdit";
import CreatorFinancesPage from "@/pages/creator/CreatorFinancesPage";
import CreatorReviewsPage from "@/pages/creator/CreatorReviewsPage";
import NotFound from "@/pages/NotFound";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import DebugPage from "@/pages/DebugPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <ErrorBoundary>
          <HashRouter>
            <Routes>
              {/* Public routes */}
              <Route element={<PublicLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/courses" element={<CoursesPage />} />
                <Route path="/course/:slug" element={<CourseDetailPage />} />
                <Route path="/creator/:slug" element={<CreatorProfilePage />} />
              </Route>

              {/* Debug route */}
              <Route path="/debug" element={<DebugPage />} />

              {/* Auth routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />

              {/* Course preview route - standalone without layout restrictions */}
              <Route path="/preview/course/:id" element={<CoursePlayerPage />} />

              {/* Student routes */}
              <Route path="/app" element={<StudentLayout />}>
                <Route index element={<StudentDashboard />} />
                <Route path="my-courses" element={<MyCoursesPage />} />
                <Route path="course/:id" element={<CoursePlayerPage />} />
                <Route path="settings" element={<StudentSettings />} />
              </Route>

              {/* Creator routes */}
              <Route path="/creator-app" element={<CreatorLayout />}>
                <Route index element={<CreatorDashboard />} />
                <Route path="products" element={<CreatorProductsPage />} />
                <Route path="courses" element={<CreatorProductsPage />} />
                <Route path="courses/new" element={<CourseEditorPage />} />
                <Route path="courses/:id/edit" element={<CourseEditorPage />} />
                <Route path="ebooks/new" element={<EbookEditorPage />} />
                <Route path="ebooks/:id/edit" element={<EbookEditorPage />} />
                <Route path="events/new" element={<EventEditorPage />} />
                <Route path="events/:id/edit" element={<EventEditorPage />} />
                <Route path="finances" element={<CreatorFinancesPage />} />
                <Route path="reviews" element={<CreatorReviewsPage />} />
                <Route path="profile" element={<CreatorProfileEdit />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </HashRouter>
        </ErrorBoundary>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
