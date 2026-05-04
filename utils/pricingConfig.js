const defaultPricingConfig = {
  regular: {
    name: 'Régulier',
    subtitle: 'Pour commencer',
    price: 22.99,
    priceAnnual: 220.70,
    priceMonthlyEquivalent: 18.39,
    savings: 55.18,
    period: '/mois',
    generations: 150,
    description: 'Idéal pour découvrir la plateforme et visualiser vos projets de rénovation.',
    features: [
      { text: '150 crédits IA / mois', included: true, addon: false },
      { text: '2 styles de design', included: true, addon: false },
      { text: 'Qualité Ultra HD', included: true, addon: false },
      { text: "Jusqu'à 2 projets", included: true, addon: false },
      { text: 'Connexion entrepreneur', included: true, addon: false },
      { text: 'Génération supplémentaire: 3,99$', included: true, addon: true },
      { text: 'Téléchargement PDF: 1,99$', included: true, addon: true }
    ],
    bonus: '🎁 Obtenez 30 générations gratuites + projets illimités en concluant un projet avec un entrepreneur!',
    cta: 'Choisir Régulier',
    ctaLink: '/auth/register?plan=regular',
    popular: false,
    badge: ''
  },
  advanced: {
    name: 'Avancé',
    subtitle: 'Le plus populaire',
    price: 39.99,
    priceAnnual: 383.90,
    priceMonthlyEquivalent: 31.99,
    savings: 95.98,
    period: '/mois',
    generations: 450,
    description: '450 générations IA par mois. Idéal pour les rénovations actives et les projets multiples.',
    features: [
      { text: '450 générations IA / mois', included: true, addon: false },
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
    priceAnnual: 767.90,
    priceMonthlyEquivalent: 63.99,
    savings: 191.98,
    period: '/mois',
    generations: 1200,
    description: '1200 générations IA par mois pour les professionnels et les grands projets.',
    features: [
      { text: '1200 générations IA / mois', included: true, addon: false },
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
    { feature: 'Générations IA', regular: '150 / mois', advanced: '450 / mois', premium: '1 200 / mois' },
    { feature: 'Styles de design', regular: '2 styles', advanced: 'Tous (80+)', premium: 'Tous (80+)' },
    { feature: 'Qualité des rendus', regular: 'Ultra HD', advanced: 'Ultra HD', premium: 'Ultra HD' },
    { feature: 'Nombre de projets', regular: '2 projets', advanced: 'Illimité', premium: 'Illimité' },
    { feature: 'Connexion entrepreneur', regular: '✓', advanced: '✓', premium: '✓' },
    { feature: 'Téléchargement PDF', regular: '1,99$ / PDF', advanced: '✓ Inclus', premium: '✓ Inclus' },
    { feature: 'Générations supplémentaires', regular: '3,99$ / gen', advanced: '3,99$ / 3 gen', premium: 'N/A' },
    { feature: 'Support', regular: 'Email', advanced: 'Prioritaire', premium: 'Prioritaire' }
  ]
};

const contractorPlans = [
  {
    id: 'free',
    name: 'Gratuit',
    subtitle: 'Pour démarrer',
    price: 0,
    priceAnnual: 0,
    priceMonthlyEquivalent: 0,
    savings: 0,
    features: [
      { text: 'Accès limité aux projets', addon: false },
      { text: 'Recommandation automatique', addon: false },
      { text: 'Commission : 20% à 25% par projet conclu', addon: true },
      { text: 'Aucune priorité', addon: true },
      { text: 'Forte concurrence', addon: true }
    ],
    popular: false,
    badge: '',
    cta: 'Commencer gratuitement',
    ctaLink: '/auth/register?type=contractor'
  },
  {
    id: 'pro',
    name: 'Pro',
    subtitle: 'Croissance stable',
    price: 169,
    priceAnnual: 1622,
    priceMonthlyEquivalent: 135,
    savings: 406,
    features: [
      { text: 'Accès aux leads qualifiés (budget + rendu IA)', addon: false },
      { text: 'Matching automatique métier / zone', addon: false },
      { text: 'Mise en avant algorithmique', addon: false },
      { text: '0% commission', addon: false }
    ],
    popular: false,
    badge: '',
    cta: "S'abonner",
    ctaLink: '/auth/register?type=contractor&plan=pro'
  },
  {
    id: 'premium',
    name: 'Premium',
    subtitle: 'Maximisez vos projets',
    price: 249,
    priceAnnual: 2390,
    priceMonthlyEquivalent: 199,
    savings: 598,
    features: [
      { text: 'Priorité sur les leads', addon: false },
      { text: 'Moins de concurrence par projet', addon: false },
      { text: 'Badge "Contracteur recommandé"', addon: false },
      { text: 'Leads premium uniquement', addon: false },
      { text: '0% commission', addon: false }
    ],
    popular: true,
    badge: '⭐ Recommandé',
    cta: "S'abonner",
    ctaLink: '/auth/register?type=contractor&plan=premium'
  },
  {
    id: 'elite',
    name: 'Élite',
    subtitle: 'Dominez votre marché',
    price: 449,
    priceAnnual: 4310,
    priceMonthlyEquivalent: 359,
    savings: 1078,
    features: [
      { text: 'Leads quasi exclusifs', addon: false },
      { text: 'Priorité maximale sur tous les projets', addon: false },
      { text: 'Accès multi-catégories', addon: false },
      { text: 'Badge "Contracteur recommandé"', addon: false },
      { text: '0% commission', addon: false }
    ],
    popular: false,
    badge: '',
    cta: "S'abonner",
    ctaLink: '/auth/register?type=contractor&plan=elite'
  }
];

function mergePlan(stored, defaultPlan) {
  if (!stored) return { ...defaultPlan };
  return {
    name: stored.name || defaultPlan.name,
    subtitle: stored.subtitle !== undefined ? stored.subtitle : defaultPlan.subtitle,
    price: stored.price !== undefined ? stored.price : defaultPlan.price,
    priceAnnual: stored.priceAnnual !== undefined ? stored.priceAnnual : defaultPlan.priceAnnual,
    priceMonthlyEquivalent: stored.priceMonthlyEquivalent !== undefined ? stored.priceMonthlyEquivalent : defaultPlan.priceMonthlyEquivalent,
    savings: stored.savings !== undefined ? stored.savings : defaultPlan.savings,
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
  mergePricingConfig,
  contractorPlans
};
