export type TranslationKey =
  | 'enterCode'
  | 'letsGo'
  | 'createHunt'
  | 'tryDemo'
  | 'huntName'
  | 'description'
  | 'addStep'
  | 'publish'
  | 'saveDraft'
  | 'validate'
  | 'tryAgain'
  | 'congratulations'
  | 'rulesTitle'
  | 'rulesGotIt'
  | 'hint'
  | 'hintCost'
  | 'wrongAnswer'
  | 'stepTitle'
  | 'enigma'
  | 'answer'
  | 'caseSensitive'
  | 'pickOnMap'
  | 'huntCode'
  | 'copyCode'
  | 'shareCode'
  | 'createAnother'
  | 'goToPlay'
  | 'editHunt'
  | 'deleteHunt'
  | 'noHunts'
  | 'savedDrafts'
  | 'latitude'
  | 'longitude'
  | 'step'
  | 'of'
  | 'playAnother'
  | 'codeCopied'
  | 'invalidCode'
  | 'emptyCode'
  | 'mapPreview'
  | 'addStepToSeeMap'
  | 'rules1'
  | 'rules2'
  | 'rules3'
  | 'completionTime'
  | 'hintsUsed'
  | 'shareText'
  | 'tagline'
  | 'score'
  | 'points';

export const translations: Record<'fr' | 'en', Record<TranslationKey, string>> = {
  fr: {
    enterCode: 'Entrez votre code',
    letsGo: "C'est parti !",
    createHunt: 'Créer une chasse',
    tryDemo: 'Essayez PARIS1',
    huntName: 'Nom de la chasse',
    description: 'Description (optionnelle)',
    addStep: 'Ajouter une étape',
    publish: 'Publier la chasse',
    saveDraft: 'Sauvegarder',
    validate: 'Valider',
    tryAgain: 'Essayez encore',
    congratulations: 'Félicitations !',
    rulesTitle: 'Comment jouer ?',
    rulesGotIt: "C'est compris !",
    hint: 'Indice',
    hintCost: 'Utiliser un indice',
    wrongAnswer: 'Mauvaise réponse, essayez encore !',
    stepTitle: 'Titre de l\'étape',
    enigma: 'Énigme',
    answer: 'Réponse',
    caseSensitive: 'Sensible à la casse',
    pickOnMap: '📍 Choisir sur la carte',
    huntCode: 'Code de la chasse',
    copyCode: 'Copier le code',
    shareCode: 'Partagez ce code avec vos joueurs',
    createAnother: 'Créer une autre chasse',
    goToPlay: 'Voir en tant que joueur',
    editHunt: 'Modifier',
    deleteHunt: 'Supprimer',
    noHunts: 'Aucune chasse créée',
    savedDrafts: 'Mes chasses',
    latitude: 'Latitude',
    longitude: 'Longitude',
    step: 'Étape',
    of: 'sur',
    playAnother: 'Jouer une autre chasse',
    codeCopied: 'Code copié !',
    invalidCode: 'Code inconnu, vérifiez et réessayez',
    emptyCode: 'Entrez un code pour commencer',
    mapPreview: 'Aperçu de la carte',
    addStepToSeeMap: 'Ajoutez des étapes pour voir la carte',
    rules1: 'Déplacez-vous jusqu\'à chaque lieu indiqué sur la carte',
    rules2: 'Résolvez l\'énigme de chaque étape pour avancer',
    rules3: 'Complétez toutes les étapes pour gagner !',
    completionTime: 'Temps de jeu',
    hintsUsed: 'Indices utilisés',
    shareText: 'Partagez votre score',
    tagline: 'La chasse au trésor dans votre poche',
    score: 'Score',
    points: 'pts',
  },
  en: {
    enterCode: 'Enter your code',
    letsGo: "Let's go!",
    createHunt: 'Create a hunt',
    tryDemo: 'Try PARIS1',
    huntName: 'Hunt name',
    description: 'Description (optional)',
    addStep: 'Add a step',
    publish: 'Publish hunt',
    saveDraft: 'Save draft',
    validate: 'Check answer',
    tryAgain: 'Try again',
    congratulations: 'Congratulations!',
    rulesTitle: 'How to play?',
    rulesGotIt: 'Got it!',
    hint: 'Hint',
    hintCost: 'Use a hint',
    wrongAnswer: 'Wrong answer, try again!',
    stepTitle: 'Step title',
    enigma: 'Enigma',
    answer: 'Answer',
    caseSensitive: 'Case sensitive',
    pickOnMap: '📍 Pick on map',
    huntCode: 'Hunt code',
    copyCode: 'Copy code',
    shareCode: 'Share this code with your players',
    createAnother: 'Create another hunt',
    goToPlay: 'View as player',
    editHunt: 'Edit',
    deleteHunt: 'Delete',
    noHunts: 'No hunts created yet',
    savedDrafts: 'My hunts',
    latitude: 'Latitude',
    longitude: 'Longitude',
    step: 'Step',
    of: 'of',
    playAnother: 'Play another hunt',
    codeCopied: 'Code copied!',
    invalidCode: 'Unknown code, please check and retry',
    emptyCode: 'Enter a code to start',
    mapPreview: 'Map preview',
    addStepToSeeMap: 'Add steps to see the map',
    rules1: 'Navigate to each location shown on the map',
    rules2: 'Solve the enigma at each step to progress',
    rules3: 'Complete all steps to win!',
    completionTime: 'Completion time',
    hintsUsed: 'Hints used',
    shareText: 'Share your score',
    tagline: 'The treasure hunt in your pocket',
    score: 'Score',
    points: 'pts',
  },
};
