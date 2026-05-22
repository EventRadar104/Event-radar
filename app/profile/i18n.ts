export type Lang = 'en' | 'no'

const translations = {
  en: {
    // Role toggle / labels
    asAttendee: 'As attendee',
    asOrganizer: 'As organizer',
    attendee: 'Attendee',
    organizer: 'Organizer',
    unableToLoadPublisher: 'Unable to load publisher data.',

    // Account card
    changePhoto: 'Change profile photo',
    yourName: 'Your name',
    cancel: 'Cancel',
    saveChanges: 'Save changes',
    saving: 'Saving…',
    errorUpload: 'Image upload failed. Please try again.',
    errorSave: 'Failed to save. Please try again.',

    // Settings rows
    notifications: 'Notifications',
    language: 'Language',
    privacy: 'Privacy',
    languageValue: 'English',

    // Notifications sheet
    notificationsTitle: 'Notifications',
    emailNotifs: 'Email notifications',
    emailNotifsDesc: 'Updates and event reminders via email',
    pushNotifs: 'Push notifications',
    pushNotifsDesc: 'Browser push notifications',
    done: 'Done',

    // Language sheet
    languageTitle: 'Language',
    langEnLabel: 'English',
    langEnSub: 'English',
    langNoLabel: 'Norsk',
    langNoSub: 'Norwegian',

    // Organizer CTA
    ctaHeading: 'Post your own events',
    ctaBody: 'Create events, track views, saves, and attendance — all in one place.',
    ctaButton: 'Become an organizer',
    ctaButtonBusy: 'Setting up…',

    // Privacy sheet
    privacyTitle: 'Privacy',
    analyticsCookies: 'Analytics cookies',
    analyticsCookiesDesc: 'Help us understand how the platform is used',
    marketingCookies: 'Marketing cookies',
    marketingCookiesDesc: 'Used for targeted advertising',
    savePreferences: 'Save preferences',
    savingPreferences: 'Saving…',
    readPrivacyPolicy: 'Read our full Privacy Policy',

    // Sign out
    signOut: 'Sign out',
  },
  no: {
    asAttendee: 'Som deltaker',
    asOrganizer: 'Som arrangør',
    attendee: 'Deltaker',
    organizer: 'Arrangør',
    unableToLoadPublisher: 'Kunne ikke laste arrangørdata.',

    changePhoto: 'Endre profilbilde',
    yourName: 'Ditt navn',
    cancel: 'Avbryt',
    saveChanges: 'Lagre endringer',
    saving: 'Lagrer…',
    errorUpload: 'Bildeopplasting mislyktes. Prøv igjen.',
    errorSave: 'Lagring mislyktes. Prøv igjen.',

    notifications: 'Varsler',
    language: 'Språk',
    privacy: 'Personvern',
    languageValue: 'Norsk',

    notificationsTitle: 'Varsler',
    emailNotifs: 'E-postvarsler',
    emailNotifsDesc: 'Oppdateringer og påminnelser via e-post',
    pushNotifs: 'Push-varsler',
    pushNotifsDesc: 'Push-varsler i nettleseren',
    done: 'Ferdig',

    languageTitle: 'Språk',
    langEnLabel: 'English',
    langEnSub: 'Engelsk',
    langNoLabel: 'Norsk',
    langNoSub: 'Norsk',

    ctaHeading: 'Del dine egne arrangementer',
    ctaBody: 'Opprett arrangementer og følg med på visninger, lagringer og påmeldinger – alt på ett sted.',
    ctaButton: 'Bli arrangør',
    ctaButtonBusy: 'Setter opp…',

    // Privacy sheet
    privacyTitle: 'Personvern',
    analyticsCookies: 'Analysecookies',
    analyticsCookiesDesc: 'Hjelper oss å forstå hvordan plattformen brukes',
    marketingCookies: 'Markedsføringscookies',
    marketingCookiesDesc: 'Brukes til målrettet reklame',
    savePreferences: 'Lagre innstillinger',
    savingPreferences: 'Lagrer…',
    readPrivacyPolicy: 'Les vår personvernerklæring',

    signOut: 'Logg ut',
  },
} as const

export function useT(lang: Lang) {
  return translations[lang]
}
