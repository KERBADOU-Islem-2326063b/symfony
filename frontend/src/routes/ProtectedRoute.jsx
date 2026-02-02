import { Navigate } from "react-router-dom";
import { isAuthenticated } from "../services/auth.state";

export default function ProtectedRoute({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" />;
}
