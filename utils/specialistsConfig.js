const defaultSpecialistsConfig = {
  imageUrl: '/assets/afterhouse.jpeg',
  imageAlt: "Spécialistes de la rénovation",
  categories: [
    {
      key: 'gros-oeuvres',
      label: 'Gros oeuvres',
      options: ['Fondations', 'Démolition', 'Maçonnerie', 'Structure', 'Toiture']
    },
    {
      key: 'second-oeuvre',
      label: 'Second oeuvre',
      options: ['Plomberie', 'Électricité', 'Chauffage', 'Cloisons & plâtrerie', 'Revêtements de sol']
    },
    {
      key: 'decoration-finition',
      label: 'Décoration et finition',
      options: ['Peinture', 'Papier peint', 'Éclairage décoratif', 'Mobilier', 'Habillage mural']
    },
    {
      key: 'ouverture-isolation',
      label: 'Ouverture et isolation',
      options: ['Fenêtres', 'Portes', 'Isolation thermique', 'Isolation phonique', 'Volets']
    },
    {
      key: 'autre',
      label: 'Autre',
      options: ['Paysagisme', 'Domotique', 'Nettoyage chantier', 'Assistance design', 'Consultation']
    }
  ]
};

const mergeSpecialistsConfig = (storedConfig) => {
  if (!storedConfig) return defaultSpecialistsConfig;

  return {
    imageUrl: storedConfig.imageUrl || defaultSpecialistsConfig.imageUrl,
    imageAlt: storedConfig.imageAlt || defaultSpecialistsConfig.imageAlt,
    videoUrl: storedConfig.videoUrl || '',
    videoPublicId: storedConfig.videoPublicId || '',
    mediaType: storedConfig.mediaType || 'image',
    categories: storedConfig.categories && storedConfig.categories.length > 0
      ? storedConfig.categories
      : defaultSpecialistsConfig.categories
  };
};

module.exports = {
  defaultSpecialistsConfig,
  mergeSpecialistsConfig
};


