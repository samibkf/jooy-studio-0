import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation keys and values
const translations = {
  en: {
    // Header
    'header.jooy_studio': 'Jooy Studio',
    'header.virtual_tutor': 'Virtual Tutor',
    'header.virtual_tutor_tooltip': 'View Virtual Tutor history and request new sessions',
    'header.upload': 'Upload',
    'header.export': 'Export',
    'header.export_tooltip': 'Export options for the selected document',
    'header.export_options': 'Export Options',
    'header.exporting': 'Exporting...',
    'header.export_qr_codes': 'Export QR Codes (.zip)',
    'header.processing': 'Processing...',
    'header.download_pdf_qr': 'Download PDF with QRs',
    'header.qr_position': 'QR Position',
    'header.top_left': 'Top Left',
    'header.top_right': 'Top Right',
    'header.export_region_data': 'Export Region Data',
    'header.account': 'Account',
    'header.api_keys': 'API Keys',
    'header.sign_out': 'Sign Out',
    'header.language': 'Language',
    'header.english': 'English',
    'header.arabic': 'العربية',
    
    // Document List
    'docs.documents': 'Documents',
    'docs.rename_document': 'Rename document',
    'docs.enter_new_name': 'Enter new name',
    'docs.cancel': 'Cancel',
    'docs.save': 'Save',
    'docs.delete_document': 'Delete document?',
    'docs.delete_warning': 'This action cannot be undone. The document and all its regions will be permanently deleted.',
    'docs.delete': 'Delete',
    
    // Credit Display
    'credits.credits': 'Credits',
    
    // Navigation
    'nav.of': 'of',
    
    // Auth
    'auth.create_account': 'Create an Account',
    'auth.welcome_back': 'Welcome Back',
    'auth.sign_up_to_start': 'Sign up to get started',
    'auth.sign_in_account': 'Sign in to your account',
    'auth.signing_in': 'Signing in...',
    'auth.continue_google': 'Continue with Google',
    'auth.continue_email': 'or continue with email',
    'auth.full_name': 'Full Name',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.remember_me': 'Remember me',
    'auth.loading': 'Loading...',
    'auth.create_account_btn': 'Create Account',
    'auth.sign_in_btn': 'Sign In',
    'auth.have_account': 'Already have an account? Sign in',
    'auth.no_account': "Don't have an account? Sign up",
    'auth.account_created': 'Account created! Please check your email for verification.',
    'auth.welcome_back_toast': 'Welcome back!',
    
    // TTS History
    'tts.virtual_tutor_requests': 'Virtual Tutor Requests',
    'tts.back_to_studio': 'Back to Studio',
    'tts.your_documents': 'Your Documents',
    'tts.loading': 'Loading...',
    'tts.request_virtual_tutor': 'Request Virtual Tutor',
    'tts.no_documents': 'No documents found.',
    'tts.request_history': 'Virtual Tutor Request History',
    'tts.document': 'Document',
    'tts.status': 'Status',
    'tts.pages': 'Pages',
    'tts.no_requests': 'No Virtual Tutor requests yet.',
    'tts.failed_fetch': 'Failed to fetch data.',
    
    // Not Found
    'error.404': '404',
    'error.page_not_found': 'Oops! Page not found',
    'error.return_home': 'Return to Home',
    
    // Common
    'common.loading': 'Loading...',
    'common.close': 'Close',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.delete': 'Delete',
  },
  ar: {
    // Header
    'header.jooy_studio': 'Jooy Studio',
    'header.virtual_tutor': 'المعلم الافتراضي',
    'header.virtual_tutor_tooltip': 'عرض سجل المعلم الافتراضي وطلبات جديدة',
    'header.upload': 'رفع',
    'header.export': 'تحميل',
    'header.export_tooltip': 'خيارات التحميل للمستند المحدد',
    'header.export_options': 'خيارات التحميل',
    'header.exporting': 'جارٍ التحميل...',
    'header.export_qr_codes': 'تحميل رموز QR (ملف .zip)',
    'header.processing': 'جارٍ المعالجة...',
    'header.download_pdf_qr': 'تنزيل PDF مع رموز QR',
    'header.qr_position': 'موضع رمز QR',
    'header.top_left': 'أعلى اليسار',
    'header.top_right': 'أعلى اليمين',
    'header.export_region_data': 'تصدير بيانات المنطقة',
    'header.account': 'الحساب',
    'header.api_keys': 'مفاتيح API',
    'header.sign_out': 'تسجيل الخروج',
    'header.language': 'اللغة',
    'header.english': 'English',
    'header.arabic': 'العربية',
    
    // Document List  
    'docs.documents': 'المستندات',
    'docs.rename_document': 'إعادة تسمية المستند',
    'docs.enter_new_name': 'أدخل الاسم الجديد',
    'docs.cancel': 'إلغاء',
    'docs.save': 'حفظ',
    'docs.delete_document': 'هل تريد حذف المستند؟',
    'docs.delete_warning': 'لا يمكن التراجع عن هذا الإجراء. سيتم حذف المستند وجميع مناطقه بشكل دائم.',
    'docs.delete': 'حذف',
    
    // Credit Display
    'credits.credits': 'أرصدة',
    
    // Navigation
    'nav.of': 'من',
    
    // Auth
    'auth.create_account': 'إنشاء حساب',
    'auth.welcome_back': 'مرحبا بعودتك',
    'auth.sign_up_to_start': 'قم بالتسجيل للبدء',
    'auth.sign_in_account': 'سجل الدخول إلى حسابك',
    'auth.signing_in': 'جارٍ تسجيل الدخول...',
    'auth.continue_google': 'المتابعة باستخدام جوجل',
    'auth.continue_email': 'أو المتابعة بالبريد الإلكتروني',
    'auth.full_name': 'الاسم الكامل',
    'auth.email': 'البريد الإلكتروني',
    'auth.password': 'كلمة المرور',
    'auth.remember_me': 'تذكرني',
    'auth.loading': 'جارٍ التحميل...',
    'auth.create_account_btn': 'إنشاء حساب',
    'auth.sign_in_btn': 'تسجيل الدخول',
    'auth.have_account': 'هل لديك حساب بالفعل؟ تسجيل الدخول',
    'auth.no_account': 'ليس لديك حساب؟ قم بالتسجيل',
    'auth.account_created': 'تم إنشاء الحساب! يرجى التحقق من بريدك الإلكتروني للتأكيد.',
    'auth.welcome_back_toast': 'مرحبا بعودتك!',
    
    // TTS History
    'tts.virtual_tutor_requests': 'طلبات المعلم الافتراضي',
    'tts.back_to_studio': 'العودة إلى الاستوديو',
    'tts.your_documents': 'مستنداتك',
    'tts.loading': 'جارٍ التحميل...',
    'tts.request_virtual_tutor': 'طلب معلم افتراضي',
    'tts.no_documents': 'لم يتم العثور على مستندات.',
    'tts.request_history': 'سجل طلبات المعلم الافتراضي',
    'tts.document': 'المستند',
    'tts.status': 'الحالة',
    'tts.pages': 'الصفحات',
    'tts.no_requests': 'لا توجد طلبات معلم افتراضي حتى الآن.',
    'tts.failed_fetch': 'فشل جلب البيانات.',
    
    // Not Found
    'error.404': '٤٠٤',
    'error.page_not_found': 'عفوًا! الصفحة غير موجودة',
    'error.return_home': 'العودة إلى الصفحة الرئيسية',
    
    // Common
    'common.loading': 'جارٍ التحميل...',
    'common.close': 'إغلاق',
    'common.cancel': 'إلغاء',
    'common.save': 'حفظ',
    'common.delete': 'حذف',
  },
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'en';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
    
    // Only set the language attribute for accessibility, not the direction
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['en']] || key;
  };

  const isRTL = language === 'ar';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
