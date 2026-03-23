import { Composition } from 'remotion';
import { ClientTutorial } from './ClientTutorial';
import { ClientTutorialSchema } from './schema';
import { InventoryTutorial } from './InventoryTutorial';
import { InventoryTutorialSchema } from './schema';
import { FPS, DURATION_FRAMES } from './constants';

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="ClientTutorial"
        component={ClientTutorial}
        schema={ClientTutorialSchema}
        durationInFrames={DURATION_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{
          clientName: 'María García López',
          clientPhone: '55 1234 5678',
          clientEmail: 'maria@correo.com',
          clientAddress: 'Av. Reforma 234, Col. Centro',
          clientCity: 'Ciudad de México',
          clientNotes: 'Cliente VIP',
        }}
      />
      <Composition
        id="InventoryTutorial"
        component={InventoryTutorial}
        schema={InventoryTutorialSchema}
        durationInFrames={DURATION_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{
          itemName: 'Hielo (Bolsa 5kg)',
          itemCategory: 'Consumible',
          itemStock: '50',
          itemMinStock: '10',
          itemUnit: 'Bolsas',
          itemCost: '35.00',
        }}
      />
    </>
  );
};
