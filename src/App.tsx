import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AuthProvider } from "@/lib/auth";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { MetaPixelTracker } from "@/components/MetaPixelTracker";
import { ThemeProvider } from "@/lib/theme";

// Eager: rutas críticas del funnel público
import HomePage from "@/pages/HomePage";
import CourseDetailPage from "@/pages/CourseDetailPage";
import EventDetailPage from "@/pages/EventDetailPage";
import EbookDetailPage from "@/pages/EbookDetailPage";
import SessionBookingPage from "@/pages/SessionBookingPage";
import ProductResolverPage from "@/pages/ProductResolverPage";
import CheckoutPage from "@/pages/CheckoutPage";
import PaymentResultPage from "@/pages/PaymentResultPage";
import PurchaseConfirmedPage from "@/pages/PurchaseConfirmedPage";
import LoginPage from "@/pages/auth/LoginPage";
import SignupPage from "@/pages/auth/SignupPage";
import NotFound from "@/pages/NotFound";

// Lazy: todo lo demás
const CoursesPage = lazy(() => import("@/pages/CoursesPage"));
const CreatorProfilePage = lazy(() => import("@/pages/CreatorProfilePage"));
const ComisionesPage = lazy(() => import("@/pages/ComisionesPage"));
const TerminosPage = lazy(() => import("@/pages/TerminosPage"));
const PrivacidadPage = lazy(() => import("@/pages/PrivacidadPage"));
const UnsubscribePage = lazy(() => import("@/pages/UnsubscribePage"));
const TrustPage = lazy(() => import("@/pages/TrustPage"));
const PreciosPage = lazy(() => import("@/pages/PreciosPage"));
const DebugPage = lazy(() => import("@/pages/DebugPage"));

const ResetPasswordPage = lazy(() => import("@/pages/auth/ResetPasswordPage"));
const ForgotPasswordPage = lazy(() => import("@/pages/auth/ForgotPasswordPage"));
const Verify2FAPage = lazy(() => import("@/pages/auth/Verify2FAPage"));

const StudentLayout = lazy(() => import("@/components/layout/StudentLayout").then(m => ({ default: m.StudentLayout })));
const StudentDashboard = lazy(() => import("@/pages/app/StudentDashboard"));
const MyCoursesPage = lazy(() => import("@/pages/app/MyCoursesPage"));
const StudentMarketplacePage = lazy(() => import("@/pages/app/StudentMarketplacePage"));
const CoursePlayerPage = lazy(() => import("@/pages/app/CoursePlayerPage"));
const StudentSettings = lazy(() => import("@/pages/app/StudentSettings"));

const CreatorLayout = lazy(() => import("@/components/layout/CreatorLayout").then(m => ({ default: m.CreatorLayout })));
const CreatorDashboard = lazy(() => import("@/pages/creator/CreatorDashboard"));
const CreatorProductsPage = lazy(() => import("@/pages/creator/CreatorProductsPage"));
const CourseEditorPage = lazy(() => import("@/pages/creator/CourseEditorPage"));
const EbookEditorPage = lazy(() => import("@/pages/creator/EbookEditorPage"));
const EventEditorPage = lazy(() => import("@/pages/creator/EventEditorPage"));
const CreatorProfileEdit = lazy(() => import("@/pages/creator/CreatorProfileEdit"));
const CreatorBillingPage = lazy(() => import("@/pages/creator/CreatorBillingPage"));
const CreatorFinancesPage = lazy(() => import("@/pages/creator/CreatorFinancesPage"));
const CreatorReviewsPage = lazy(() => import("@/pages/creator/CreatorReviewsPage"));
const CreatorCommunitiesPage = lazy(() => import("@/pages/creator/CreatorCommunitiesPage"));
const CommunityManagePage = lazy(() => import("@/pages/creator/CommunityManagePage"));
const CheckoutPagesPage = lazy(() => import("@/pages/creator/CheckoutPagesPage"));
const CheckoutPageEditorPage = lazy(() => import("@/pages/creator/CheckoutPageEditorPage"));
const CreatorIntegrationsPage = lazy(() => import("@/pages/creator/CreatorIntegrationsPage"));
const CreatorAvailabilityPage = lazy(() => import("@/pages/creator/CreatorAvailabilityPage"));
const CreatorBookingsPage = lazy(() => import("@/pages/creator/CreatorBookingsPage"));
const SessionEditorPage = lazy(() => import("@/pages/creator/SessionEditorPage"));
const CreatorPlanPage = lazy(() => import("@/pages/creator/CreatorPlanPage"));

const CommunityPage = lazy(() => import("@/pages/community/CommunityPage"));
const CommunityPostPage = lazy(() => import("@/pages/community/CommunityPostPage"));
const SessionBookingSuccessPage = lazy(() => import("@/pages/SessionBookingSuccessPage"));

const AdminLayout = lazy(() => import("@/components/layout/AdminLayout").then(m => ({ default: m.AdminLayout })));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminCoursesPage = lazy(() => import("@/pages/admin/AdminCoursesPage"));
const AdminCourseEditorPage = lazy(() => import("@/pages/admin/AdminCourseEditorPage"));
const AdminInstructorsPage = lazy(() => import("@/pages/admin/AdminInstructorsPage"));
const AdminVideoMigrationPage = lazy(() => import("@/pages/admin/AdminVideoMigrationPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const RouteFallback = () => (
  <div className="flex items-center justify-center py-24">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <ErrorBoundary>
            <BrowserRouter>
              <MetaPixelTracker />
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  {/* Public routes */}
                  <Route element={<PublicLayout />}>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/courses" element={<CoursesPage />} />
                    <Route path="/precios" element={<PreciosPage />} />
                    <Route path="/course/:slug" element={<CourseDetailPage />} />
                    <Route path="/event/:slug" element={<EventDetailPage />} />
                    <Route path="/ebook/:slug" element={<EbookDetailPage />} />
                    <Route path="/creator/:slug" element={<CreatorProfilePage />} />
                  </Route>

                  <Route path="/comisiones" element={<ComisionesPage />} />
                  <Route path="/terminos" element={<TerminosPage />} />
                  <Route path="/privacidad" element={<PrivacidadPage />} />
                  <Route path="/unsubscribe" element={<UnsubscribePage />} />
                  <Route path="/trust" element={<TrustPage />} />

                  {import.meta.env.DEV && <Route path="/debug" element={<DebugPage />} />}

                  {/* Auth */}
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignupPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  <Route path="/verify-2fa" element={<Verify2FAPage />} />

                  {/* Course preview */}
                  <Route path="/preview/course/:id" element={<CoursePlayerPage />} />

                  {/* Student */}
                  <Route path="/app" element={<StudentLayout />}>
                    <Route index element={<StudentDashboard />} />
                    <Route path="my-courses" element={<MyCoursesPage />} />
                    <Route path="marketplace" element={<StudentMarketplacePage />} />
                    <Route path="course/:id" element={<CoursePlayerPage />} />
                    <Route path="settings" element={<StudentSettings />} />
                  </Route>

                  {/* Creator */}
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
                    <Route path="communities" element={<CreatorCommunitiesPage />} />
                    <Route path="communities/:id/manage" element={<CommunityManagePage />} />
                    <Route path="checkout-pages" element={<CheckoutPagesPage />} />
                    <Route path="checkout-pages/new" element={<CheckoutPageEditorPage />} />
                    <Route path="checkout-pages/:id/edit" element={<CheckoutPageEditorPage />} />
                    <Route path="profile" element={<CreatorProfileEdit />} />
                    <Route path="plan" element={<CreatorPlanPage />} />
                    <Route path="billing" element={<CreatorBillingPage />} />
                    <Route path="integrations" element={<CreatorIntegrationsPage />} />
                    <Route path="availability" element={<CreatorAvailabilityPage />} />
                    <Route path="bookings" element={<CreatorBookingsPage />} />
                    <Route path="sessions/new" element={<SessionEditorPage />} />
                    <Route path="sessions/:id/edit" element={<SessionEditorPage />} />
                  </Route>

                  {/* 1:1 Booking */}
                  <Route path="/c/:creatorSlug/sesion/:sessionId" element={<SessionBookingPage />} />
                  <Route path="/booking/success" element={<SessionBookingSuccessPage />} />

                  {/* Admin */}
                  <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="courses" element={<AdminCoursesPage />} />
                    <Route path="courses/new" element={<AdminCourseEditorPage />} />
                    <Route path="courses/:id/edit" element={<AdminCourseEditorPage />} />
                    <Route path="instructors" element={<AdminInstructorsPage />} />
                    <Route path="video-migration" element={<AdminVideoMigrationPage />} />
                  </Route>

                  {/* Community */}
                  <Route path="/c/:slug" element={<CommunityPage />} />
                  <Route path="/c/:slug/p/:postId" element={<CommunityPostPage />} />

                  {/* Payment result */}
                  <Route path="/payment/:result" element={<PaymentResultPage />} />

                  {/* Custom checkout */}
                  <Route path="/p/:creatorSlug/:pageSlug" element={<CheckoutPage />} />
                  <Route path="/embed/:creatorSlug/:pageSlug" element={<CheckoutPage embed />} />

                  {/* Public product URL resolver */}
                  <Route element={<PublicLayout />}>
                    <Route path="/:creatorSlug/:slug" element={<ProductResolverPage />} />
                  </Route>

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </ErrorBoundary>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
