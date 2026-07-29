import React from "react";
import { MapPin, Navigation } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/Card";
import type { PublicLocation } from "@/services/publicProfileService";

interface PublicProfileMapProps {
  location: PublicLocation;
  businessName?: string;
}

export const PublicProfileMap: React.FC<PublicProfileMapProps> = ({
  location,
  businessName,
}) => {
  const { t } = useTranslation("public");

  const addressText = [location.address, location.city, location.state]
    .filter(Boolean)
    .join(", ");

  if (!addressText) {
    return null;
  }

  const query = [businessName, addressText].filter(Boolean).join(" ");
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  const iframeUrl = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=&z=14&ie=UTF8&iwloc=&output=embed`;

  return (
    <section className="mt-8" id="profile-location" data-testid="public-profile-map-section">
      <h3 className="text-base font-semibold text-text flex items-center gap-2 mb-3">
        <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
        {t("profile.actions.location_heading")}
      </h3>

      <Card className="overflow-hidden p-0 border border-border bg-surface shadow-xs">
        <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60">
          <div>
            <p className="text-sm font-semibold text-text">{businessName}</p>
            <p className="text-xs text-text-secondary mt-0.5">{addressText}</p>
          </div>

          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary/10 px-4 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary w-full sm:w-auto"
            data-testid="get-directions-button"
          >
            <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
            {t("profile.actions.get_directions")}
          </a>
        </div>

        <div className="relative w-full h-64 bg-surface-alt">
          <iframe
            title={`Mapa de ${businessName || addressText}`}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            allowFullScreen
            src={iframeUrl}
            data-testid="location-iframe"
          />
        </div>
      </Card>
    </section>
  );
};
