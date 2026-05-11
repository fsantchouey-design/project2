const User = require('../models/User');
const aiToolsConfig = require('../config/toolsConfig');

// Returns the credit cost for a given toolKey, or null if the tool is unknown.
function getAiToolCreditCost(toolKey) {
  const config = aiToolsConfig[toolKey];
  if (!config) return null;
  return typeof config.credits === 'number' ? config.credits : 0;
}

// Fetches the user from DB and verifies they have enough credits for toolKey.
// Returns { ok, cost, balance, error }
async function checkUserCreditsBeforeGeneration(userId, toolKey) {
  if (!userId) {
    return { ok: false, cost: 0, balance: 0, error: 'Utilisateur non authentifié.' };
  }

  const cost = getAiToolCreditCost(toolKey);
  if (cost === null) {
    return { ok: false, cost: 0, balance: 0, error: `Outil IA inconnu : ${toolKey}.` };
  }

  const user = await User.findById(userId).select('subscription');
  if (!user) {
    return { ok: false, cost, balance: 0, error: 'Utilisateur introuvable.' };
  }

  const balance = (user.subscription && user.subscription.credits != null)
    ? user.subscription.credits
    : 0;

  if (balance < cost) {
    return {
      ok: false, cost, balance,
      error: `Crédits IA insuffisants. Coût : ${cost} crédits, solde disponible : ${balance} crédits.`
    };
  }

  return { ok: true, cost, balance };
}

// Atomically deducts `cost` credits from the user's balance after a successful generation.
// Clamps the balance at 0 to prevent negative values.
// Returns the new balance, or null on failure.
async function deductCreditsAfterSuccessfulGeneration(userId, cost) {
  if (!userId || !cost) return null;

  const updated = await User.findByIdAndUpdate(
    userId,
    {
      $inc: {
        'subscription.credits':     -cost,
        'subscription.creditsUsed':  cost
      }
    },
    { new: true }
  );

  if (!updated) return null;

  // Guard: credits must never be negative (race condition safety)
  if (updated.subscription.credits < 0) {
    await User.findByIdAndUpdate(userId, { $set: { 'subscription.credits': 0 } });
    return 0;
  }

  return updated.subscription.credits;
}

module.exports = {
  getAiToolCreditCost,
  checkUserCreditsBeforeGeneration,
  deductCreditsAfterSuccessfulGeneration
};
