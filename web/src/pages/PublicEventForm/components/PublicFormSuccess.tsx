import React from "react";
import { CheckCircle2, PartyPopper } from "lucide-react";

interface Props {
  organizerName?: string;
  brandColor: string;
}

export const PublicFormSuccess: React.FC<Props> = ({
  organizerName,
  brandColor,
}) => {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div
          className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: `${brandColor}15` }}
        >
          <CheckCircle2
            className="h-8 w-8"
            style={{ color: brandColor }}
          />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-text tracking-tight">
            ¡Solicitud enviada!
          </h1>
          <p className="text-text-secondary text-sm leading-relaxed">
            {organizerName ? (
              <>
                <span className="font-medium text-text">{organizerName}</span>{" "}
                ha recibido tu información y se pondrá en contacto contigo
                pronto.
              </>
            ) : (
              "El organizador ha recibido tu información y se pondrá en contacto contigo pronto."
            )}
          </p>
        </div>

        <div
          className="rounded-xl p-4 flex items-center justify-center gap-2 text-sm"
          style={{
            backgroundColor: `${brandColor}10`,
            color: brandColor,
          }}
        >
          <PartyPopper className="h-5 w-5" />
          <span className="font-medium">
            Gracias por tu interés
          </span>
        </div>
      </div>
    </div>
  );
};
