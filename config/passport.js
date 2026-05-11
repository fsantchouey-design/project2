const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const ADMIN_EMAIL = 'craftycrib.ca@gmail.com';

module.exports = function(passport) {
  // ── Local Strategy ──
  passport.use(
    new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
      try {
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
          return done(null, false, { message: 'Email not registered' });
        }

        if (!user.isVerified) {
          return done(null, false, { message: 'Please verify your email before logging in' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (isMatch) {
          user.lastLogin = new Date();
          // Self-heal: ensure admin email always has admin privileges
          if (user.email === ADMIN_EMAIL && user.role !== 'admin') {
            user.role = 'admin';
            user.proStatus = 'approved';
          }
          await user.save();
          return done(null, user);
        } else {
          return done(null, false, { message: 'Incorrect password' });
        }
      } catch (err) {
        return done(err);
      }
    })
  );

  // ── Google OAuth Strategy ──
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'https://craftycrib.com/auth/callback'
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists with this Google ID
      let user = await User.findOne({ googleId: profile.id });

      if (user) {
        user.lastLogin = new Date();
        await user.save();
        return done(null, user);
      }

      // Check if email already registered (link accounts)
      const email = profile.emails?.[0]?.value;
      const isAdmin = email && email.toLowerCase() === ADMIN_EMAIL;

      if (email) {
        user = await User.findOne({ email: email.toLowerCase() });
        if (user) {
          user.googleId = profile.id;
          user.isVerified = true;
          user.lastLogin = new Date();
          // Ensure admin email always has admin privileges
          if (isAdmin && user.role !== 'admin') {
            user.role = 'admin';
            user.proStatus = 'approved';
          }
          await user.save();
          return done(null, user);
        }
      }

      // Create new user — admin email gets elevated privileges immediately
      user = await User.create({
        googleId: profile.id,
        firstName: profile.name?.givenName || profile.displayName,
        lastName: profile.name?.familyName || '',
        email: email?.toLowerCase(),
        isVerified: true,
        role: isAdmin ? 'admin' : 'client',
        proStatus: isAdmin ? 'approved' : 'none',
        lastLogin: new Date()
      });

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }));

  // ── Serialize / Deserialize ──
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
};

