import { Hunt } from '../../types';

export const DEMO_HUNT: Hunt = {
  id: 'demo-paris-1',
  name: 'Paris Classique',
  description: 'Découvrez les monuments emblématiques de Paris dans cette chasse au trésor classique.',
  accessCode: 'PARIS1',
  published: true,
  createdAt: '2024-01-01T00:00:00Z',
  steps: [
    {
      id: 'step-1',
      title: 'Tour Eiffel',
      address: 'Champ de Mars, 5 Av. Anatole France, 75007 Paris, France',
      lat: 48.8584,
      lng: 2.2945,
      enigmas: [
        {
          id: 'step-1-e1',
          title: '',
          description: 'Je suis une dame de fer qui domine Paris depuis 1889. Gustave m\'a construite pour une exposition universelle. Combien de niveaux accessibles aux visiteurs ai-je ?',
          answer: { type: 'text', text: '3', caseSensitive: false, options: [], mediaAccept: { photo: true, video: true } },
        },
      ],
      media: [],
    },
    {
      id: 'step-2',
      title: 'Arc de Triomphe',
      address: 'Place Charles de Gaulle, 75008 Paris, France',
      lat: 48.8738,
      lng: 2.295,
      enigmas: [
        {
          id: 'step-2-e1',
          title: '',
          description: 'Je suis au centre d\'une étoile de 12 avenues. Quelle avenue descend depuis moi jusqu\'à la place de la Concorde ?',
          answer: {
            type: 'radio',
            text: '',
            caseSensitive: false,
            options: [
              { id: 'arc-a', label: 'Avenue Kléber', isCorrect: false },
              { id: 'arc-b', label: 'Avenue des Champs-Élysées', isCorrect: true },
              { id: 'arc-c', label: 'Avenue de la Grande Armée', isCorrect: false },
              { id: 'arc-d', label: 'Avenue Wagram', isCorrect: false },
            ],
            mediaAccept: { photo: true, video: true },
          },
        },
      ],
      media: [],
    },
    {
      id: 'step-3',
      title: 'Notre-Dame de Paris',
      address: '6 Parvis Notre-Dame - Pl. Jean-Paul II, 75004 Paris, France',
      lat: 48.853,
      lng: 2.3499,
      enigmas: [
        {
          id: 'step-3-e1',
          title: 'Les personnages',
          description: 'Parmi ces personnages, lesquels apparaissent dans le roman «Notre-Dame de Paris» de Victor Hugo ?',
          answer: {
            type: 'checkbox',
            text: '',
            caseSensitive: false,
            options: [
              { id: 'nd-a', label: 'Quasimodo', isCorrect: true },
              { id: 'nd-b', label: 'Esmeralda', isCorrect: true },
              { id: 'nd-c', label: 'Claude Frollo', isCorrect: true },
              { id: 'nd-d', label: 'Sherlock Holmes', isCorrect: false },
            ],
            mediaAccept: { photo: true, video: true },
          },
        },
        {
          id: 'step-3-e2',
          title: 'Preuve de passage',
          description: 'Prenez une photo de la façade de Notre-Dame depuis le parvis pour valider votre présence sur les lieux.',
          answer: {
            type: 'media',
            text: '',
            caseSensitive: false,
            options: [],
            mediaAccept: { photo: true, video: false },
          },
        },
      ],
      media: [],
    },
  ],
};
