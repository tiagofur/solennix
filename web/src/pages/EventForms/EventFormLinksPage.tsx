import React, { useEffect } from "react";
import { Navigate } from "react-router-dom";

/**
 * Legacy route: Formularios moved into Solicitudes hub Links tab.
 * Keep file so any deep import still resolves; App routes redirect here too.
 */
export const EventFormLinksPage: React.FC = () => {
  useEffect(() => {
    // no-op: Navigate handles redirect
  }, []);
  return <Navigate to="/requests?tab=links" replace />;
};

export default EventFormLinksPage;
