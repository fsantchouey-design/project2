const defaultPricingConfig = {
  regular: {
    name: 'Régulier',
    subtitle: 'Pour commencer',
    price: 0,
    period: 'gratuit',
    generations: 3,
    description: 'Démarrez gratuitement avec 3 générations IA. Parfait pour tester la plateforme.',
    features: [
      { text: '3 générations IA', included: true, addon: false },
      { text: '2 styles de design', included: true, addon: false },
      { text: 'Qualité Ultra HD', included: true, addon: false },
      { text: "Jusqu'à 2 projets", included: true, addon: false },
      { text: 'Connexion entrepreneur', included: true, addon: false },
      { text: 'Génération supplémentaire: 3,99$', included: true, addon: true },
      { text: 'Téléchargement PDF: 1,99$', included: true, addon: true }
    ],
    bonus: '🎁 Obtenez 30 générations gratuites + projets illimités en concluant un projet avec un entrepreneur!',
    cta: 'Commencer gratuitement',
    ctaLink: '/auth/register',
    popular: false,
    badge: ''
  },
  advanced: {
    name: 'Avancé',
    subtitle: 'Le plus populaire',
    price: 29.99,
    period: '/mois',
    generations: 50,
    description: '50 générations IA par mois. Idéal pour les rénovations actives et les projets multiples.',
    features: [
      { text: '50 générations IA / mois', included: true, addon: false },
      { text: 'Tous les styles de design', included: true, addon: false },
      { text: 'Qualité Ultra HD', included: true, addon: false },
      { text: 'Projets illimités', included: true, addon: false },
      { text: 'Connexion entrepreneur', included: true, addon: false },
      { text: 'Téléchargement PDF inclus', included: true, addon: false },
      { text: '3 générations supplémentaires: 3,99$', included: true, addon: true }
    ],
    bonus: '',
    cta: 'Choisir Avancé',
    ctaLink: '/auth/register?plan=advanced',
    popular: true,
    badge: '⭐ Recommandé'
  },
  premium: {
    name: 'Premium',
    subtitle: 'Sans limites',
    price: 79.99,
    period: '/mois',
    generations: 0,
    description: 'Générations illimitées pour les professionnels et les grands projets.',
    features: [
      { text: 'Générations IA illimitées', included: true, addon: false },
      { text: 'Tous les styles de design', included: true, addon: false },
      { text: 'Qualité Ultra HD', included: true, addon: false },
      { text: 'Projets illimités', included: true, addon: false },
      { text: 'Connexion entrepreneur', included: true, addon: false },
      { text: 'Téléchargement PDF inclus', included: true, addon: false },
      { text: 'Support prioritaire', included: true, addon: false }
    ],
    bonus: '',
    cta: 'Choisir Premium',
    ctaLink: '/auth/register?plan=premium',
    popular: false,
    badge: '👑 Pro'
  },
  comparison: [
    { feature: 'Générations IA', regular: '3 total', advanced: '50 / mois', premium: 'Illimitées' },
    { feature: 'Styles de design', regular: '2 styles', advanced: 'Tous (80+)', premium: 'Tous (80+)' },
    { feature: 'Qualité des rendus', regular: 'Ultra HD', advanced: 'Ultra HD', premium: 'Ultra HD' },
    { feature: 'Nombre de projets', regular: '2 projets', advanced: 'Illimité', premium: 'Illimité' },
    { feature: 'Connexion entrepreneur', regular: '✓', advanced: '✓', premium: '✓' },
    { feature: 'Téléchargement PDF', regular: '1,99$ / PDF', advanced: '✓ Inclus', premium: '✓ Inclus' },
    { feature: 'Générations supplémentaires', regular: '3,99$ / gen', advanced: '3,99$ / 3 gen', premium: 'N/A' },
    { feature: 'Support', regular: 'Email', advanced: 'Prioritaire', premium: 'Prioritaire' }
  ]
};

function mergePlan(stored, defaultPlan) {
  if (!stored) return { ...defaultPlan };
  return {
    name: stored.name || defaultPlan.name,
    subtitle: stored.subtitle !== undefined ? stored.subtitle : defaultPlan.subtitle,
    price: stored.price !== undefined ? stored.price : defaultPlan.price,
    period: stored.period !== undefined ? stored.period : defaultPlan.period,
    generations: stored.generations !== undefined ? stored.generations : defaultPlan.generations,
    description: stored.description || defaultPlan.description,
    features: stored.features && stored.features.length > 0 ? stored.features : defaultPlan.features,
    bonus: stored.bonus !== undefined ? stored.bonus : defaultPlan.bonus,
    cta: stored.cta || defaultPlan.cta,
    ctaLink: stored.ctaLink || defaultPlan.ctaLink,
    popular: stored.popular !== undefined ? stored.popular : defaultPlan.popular,
    badge: stored.badge !== undefined ? stored.badge : defaultPlan.badge
  };
}

const mergePricingConfig = (storedConfig) => {
  if (!storedConfig) return { ...defaultPricingConfig };

  return {
    regular: mergePlan(storedConfig.regular, defaultPricingConfig.regular),
    advanced: mergePlan(storedConfig.advanced, defaultPricingConfig.advanced),
    premium: mergePlan(storedConfig.premium, defaultPricingConfig.premium),
    comparison: storedConfig.comparison && storedConfig.comparison.length > 0
      ? storedConfig.comparison
      : defaultPricingConfig.comparison
  };
};

module.exports = {
  defaultPricingConfig,
  mergePricingConfig
};

