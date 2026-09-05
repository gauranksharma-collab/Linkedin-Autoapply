import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import NavBar from "./components/NavBar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import LinkedInConnect from "./pages/LinkedInConnect";
import Dashboard from "./pages/Dashboard";
import QuestionBank from "./pages/QuestionBank";
import PendingQuestions from "./pages/PendingQuestions";
import ApplicationHistory from "./pages/ApplicationHistory";
import Settings from "./pages/Settings";

function Shell({ children }) {
  return (
    <div className="min-h-screen">
      <NavBar />
      {children}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Shell>
                  <Dashboard />
                </Shell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Shell>
                  <Profile />
                </Shell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/linkedin"
            element={
              <ProtectedRoute>
                <Shell>
                  <LinkedInConnect />
                </Shell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/questions"
            element={
              <ProtectedRoute>
                <Shell>
                  <QuestionBank />
                </Shell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/pending"
            element={
              <ProtectedRoute>
                <Shell>
                  <PendingQuestions />
                </Shell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <Shell>
                  <ApplicationHistory />
                </Shell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Shell>
                  <Settings />
                </Shell>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
