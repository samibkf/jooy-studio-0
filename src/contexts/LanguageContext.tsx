
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
    'docs.document_renamed': 'Document renamed',
    'docs.document_deleted': 'Document deleted',
    
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
    'auth.loading_authentication': 'Loading authentication...',
    'auth.error_invalid_credentials': 'Invalid email or password',
    'auth.error_weak_password': 'Password should be at least 6 characters',
    'auth.error_email_taken': 'Email address is already registered',
    'auth.error_network': 'Network error. Please check your connection',
    'auth.error_generic': 'An error occurred. Please try again',
    'auth.verification_email_sent': 'Verification email sent',
    'auth.password_reset_sent': 'Password reset email sent',
    'auth.forgot_password': 'Forgot your password?',
    'auth.reset_password': 'Reset Password',
    'auth.back_to_sign_in': 'Back to Sign In',
    'auth.send_reset_email': 'Send Reset Email',
    'auth.enter_email_reset': 'Enter your email to reset your password',
    
    // Protected Route
    'protected.loading_auth': 'Loading authentication...',
    
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
    
    // PDF Viewer
    'pdf.welcome_title': 'Welcome to Jooy Studio',
    'pdf.welcome_subtitle': 'Interactive Books Start Here',
    'pdf.login_required': 'Please log in to view PDFs',
    'pdf.loading_pdf': 'Loading PDF...',
    'pdf.debug_info': 'Debug Info',
    'pdf.retry': 'Retry',
    'pdf.area_selection': 'Area Selection',
    'pdf.area_selection_tooltip': 'Draw custom area regions on the PDF',
    'pdf.copy_page': 'Copy Page',
    'pdf.copy_page_tooltip': 'Copy current page as image to clipboard',
    'pdf.page_copied': 'Page copied to clipboard',
    'pdf.copy_failed': 'Failed to copy page',
    'pdf.zoom_out': 'Zoom out',
    'pdf.zoom_in': 'Zoom in',
    'pdf.make_private': 'Make document private',
    'pdf.make_public': 'Make document public',
    'pdf.drm_settings': 'Configure DRM protection settings',
    'pdf.canvas_not_available': 'Canvas not available',
    'pdf.failed_create_blob': 'Failed to create image blob',
    'pdf.page_number_error': 'Please enter a page number between 1 and',
    
    // Sidebar
    'sidebar.content_tools': 'Content Tools',
    'sidebar.toggle_manual_input': 'Toggle Manual Text Input',
    'sidebar.unnamed_region': 'Unnamed Region',
    'sidebar.text_label': 'Text:',
    'sidebar.add_description': 'Add a description...',
    'sidebar.description_saved': 'Description saved',
    'sidebar.region_deleted': 'Region deleted',
    'sidebar.text_assignment_undone': 'Text assignment undone',
    'sidebar.select_region': 'Select a region to edit its details',
    'sidebar.delete_region_confirm': 'Are you sure you want to delete this region?',
    'sidebar.loading': 'Loading...',
    
    // Text Insert
    'textinsert.ai_generation': 'AI Generation',
    'textinsert.generate_tooltip': 'Generate AI Guidance for this page',
    'textinsert.system_instructions': 'AI System Instructions',
    'textinsert.system_instructions_desc': "Define the AI's behavior for content generation.",
    'textinsert.auto_assign': 'Auto-assign to regions',
    'textinsert.or': 'Or',
    'textinsert.insert_manually': 'Insert Text Manually:',
    'textinsert.page': 'Page',
    'textinsert.paste_markdown': 'Paste your markdown text here...',
    'textinsert.insert_to_page': 'Insert to Page',
    'textinsert.unassigned_texts': 'Unassigned Texts (Page',
    'textinsert.assigned_texts': 'Assigned Texts (Page',
    'textinsert.assign_to_region': 'Assign to Region (Page',
    'textinsert.no_unassigned_regions': 'No unassigned regions on page',
    'textinsert.assigned_to': 'Assigned to:',
    'textinsert.preview_text': 'Preview Text',
    'textinsert.delete_text': 'Delete Text',
    'textinsert.delete_confirm': 'Are you absolutely sure?',
    'textinsert.delete_warning': 'This will permanently delete the text titled',
    'textinsert.delete_warning_end': 'This action cannot be undone.',
    'textinsert.close': 'Close',
    'textinsert.no_text_selected': 'No text selected for deletion.',
    'textinsert.text_deleted': 'deleted successfully.',
    'textinsert.delete_failed': 'Failed to delete text.',
    'textinsert.no_document_selected': 'No document selected.',
    'textinsert.api_key_not_set': 'Gemini API Key is not set. Please set it in the header.',
    'textinsert.api_dialog_opened': 'API settings dialog opened. Please configure your API keys.',
    'textinsert.system_instructions_empty': 'System instructions cannot be empty.',
    'textinsert.generating_guidance': 'Generating guidance from page...',
    'textinsert.no_regions_found': 'No regions found on page',
    'textinsert.add_regions_first': 'Please add regions first.',
    'textinsert.pdf_not_loaded': 'PDF is not loaded. Please wait a moment and try again.',
    'textinsert.generating_qr': 'Generating QR codes...',
    'textinsert.ai_empty_content': 'AI returned empty content.',
    'textinsert.ai_generated_chars': 'AI generated',
    'textinsert.characters_content': 'characters of content',
    'textinsert.guidance_generated_assigned': 'AI guidance generated and automatically assigned to',
    'textinsert.regions_text': 'regions.',
    'textinsert.guidance_generated_manual': 'AI guidance generated with',
    'textinsert.texts_assign_manual': 'texts. Please assign them manually.',
    'textinsert.ai_format_error': 'AI response format is not compatible. Try adjusting the system instructions.',
    'textinsert.enter_text': 'Please enter some text to insert',
    'textinsert.no_regions_available': 'No regions available on page',
    'textinsert.text_assigned_to_regions': 'Text assigned to',
    'textinsert.regions_on_page': 'regions on page',
    'textinsert.assignments_undone': 'Text assignments undone for page',
    'textinsert.cannot_undo_different_page': 'Cannot undo assignment from a different page',
    'textinsert.text_unassigned': 'Text unassigned from region',
    'textinsert.cannot_assign_different_page': 'Cannot assign text to a region on a different page',
    'textinsert.assigned_to_region': 'Assigned',
    'textinsert.to_region': 'to region',
    
    // DRM Settings
    'drm.protection': 'DRM Protection',
    'drm.manage_settings_for': 'Manage DRM settings for',
    'drm.protect_entire_document': 'Protect entire document',
    'drm.select_pages_to_protect': 'Select pages to protect:',
    'drm.page_number': 'Page',
    'drm.upgrade_subscription': 'Upgrade to a subscription to enable DRM protection.',
    'drm.subscriber_required': 'You must be a subscriber to use DRM protection.',
    'drm.saving': 'Saving...',
    'drm.save_changes': 'Save Changes',
    
    // API Keys
    'api.set_gemini_keys': 'Set Gemini API Keys',
    'api.description': 'Add one or more API keys. The system will automatically switch to another key if one reaches its limit. Your keys are stored only in your browser. Get keys from',
    'api.google_ai_studio': 'Google AI Studio',
    'api.your_keys': 'Your API Keys',
    'api.key_number': 'Key',
    'api.remove_key': 'Remove Key',
    'api.enter_new_key': 'Enter a new Gemini API key',
    'api.add_key': 'Add Key',
    'api.save_keys': 'Save Keys',
    'api.key_empty_error': 'API Key cannot be empty.',
    'api.key_exists_error': 'This API key has already been added.',
    'api.key_added_info': 'API key added. Click "Save Keys" to persist changes.',
    'api.keys_saved_success': 'Gemini API Keys saved successfully.',
    
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
    'header.virtual_tutor_tooltip': 'عرض سجل المعلم الافتراضي وطلب جلسات جديدة',
    'header.upload': 'رفع',
    'header.export': 'تصدير',
    'header.export_tooltip': 'خيارات التصدير للمستند المحدد',
    'header.export_options': 'خيارات التصدير',
    'header.exporting': 'جارٍ التصدير...',
    'header.export_qr_codes': 'تصدير رموز QR (ملف .zip)',
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
    'docs.document_renamed': 'تم إعادة تسمية المستند',
    'docs.document_deleted': 'تم حذف المستند',
    
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
    'auth.loading_authentication': 'جارٍ تحميل المصادقة...',
    'auth.error_invalid_credentials': 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
    'auth.error_weak_password': 'يجب أن تكون كلمة المرور 6 أحرف على الأقل',
    'auth.error_email_taken': 'عنوان البريد الإلكتروني مسجل بالفعل',
    'auth.error_network': 'خطأ في الشبكة. يرجى التحقق من اتصالك',
    'auth.error_generic': 'حدث خطأ. يرجى المحاولة مرة أخرى',
    'auth.verification_email_sent': 'تم إرسال بريد التحقق الإلكتروني',
    'auth.password_reset_sent': 'تم إرسال بريد إعادة تعيين كلمة المرور',
    'auth.forgot_password': 'نسيت كلمة المرور؟',
    'auth.reset_password': 'إعادة تعيين كلمة المرور',
    'auth.back_to_sign_in': 'العودة إلى تسجيل الدخول',
    'auth.send_reset_email': 'إرسال بريد إعادة التعيين',
    'auth.enter_email_reset': 'أدخل بريدك الإلكتروني لإعادة تعيين كلمة المرور',
    
    // Protected Route
    'protected.loading_auth': 'جارٍ تحميل المصادقة...',
    
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
    
    // PDF Viewer
    'pdf.welcome_title': 'مرحبًا بك في استوديو جوي',
    'pdf.welcome_subtitle': 'الكتب التفاعلية تبدأ من هنا',
    'pdf.login_required': 'يرجى تسجيل الدخول لعرض ملفات PDF',
    'pdf.loading_pdf': 'جارٍ تحميل PDF...',
    'pdf.debug_info': 'معلومات التشخيص',
    'pdf.retry': 'إعادة المحاولة',
    'pdf.area_selection': 'تحديد المنطقة',
    'pdf.area_selection_tooltip': 'رسم مناطق مخصصة على PDF',
    'pdf.copy_page': 'نسخ الصفحة',
    'pdf.copy_page_tooltip': 'نسخ الصفحة الحالية كصورة إلى الحافظة',
    'pdf.page_copied': 'تم نسخ الصفحة إلى الحافظة',
    'pdf.copy_failed': 'فشل في نسخ الصفحة',
    'pdf.zoom_out': 'تصغير',
    'pdf.zoom_in': 'تكبير',
    'pdf.make_private': 'جعل المستند خاص',
    'pdf.make_public': 'جعل المستند عام',
    'pdf.drm_settings': 'إعدادات إدارة الحقوق الرقمية',
    'pdf.canvas_not_available': 'اللوحة القماشية غير متاحة',
    'pdf.failed_create_blob': 'فشل في إنشاء صورة blob',
    'pdf.page_number_error': 'يرجى إدخال رقم صفحة بين 1 و',
    
    // Sidebar
    'sidebar.content_tools': 'أدوات المحتوى',
    'sidebar.toggle_manual_input': 'تبديل إدخال النص اليدوي',
    'sidebar.unnamed_region': 'منطقة بدون اسم',
    'sidebar.text_label': 'النص:',
    'sidebar.add_description': 'أضف وصفًا...',
    'sidebar.description_saved': 'تم حفظ الوصف',
    'sidebar.region_deleted': 'تم حذف المنطقة',
    'sidebar.text_assignment_undone': 'تم التراجع عن تعيين النص',
    'sidebar.select_region': 'اختر منطقة لتعديل تفاصيلها',
    'sidebar.delete_region_confirm': 'هل أنت متأكد من أنك تريد حذف هذه المنطقة؟',
    'sidebar.loading': 'جارٍ التحميل...',
    
    // Text Insert
    'textinsert.ai_generation': 'توليد الذكاء الاصطناعي',
    'textinsert.generate_tooltip': 'توليد إرشادات الذكاء الاصطناعي لهذه الصفحة',
    'textinsert.system_instructions': 'تعليمات نظام الذكاء الاصطناعي',
    'textinsert.system_instructions_desc': 'تحديد سلوك الذكاء الاصطناعي لتوليد المحتوى.',
    'textinsert.auto_assign': 'تعيين تلقائي للمناطق',
    'textinsert.or': 'أو',
    'textinsert.insert_manually': 'إدراج النص يدويًا:',
    'textinsert.page': 'الصفحة',
    'textinsert.paste_markdown': 'الصق نص markdown هنا...',
    'textinsert.insert_to_page': 'إدراج في الصفحة',
    'textinsert.unassigned_texts': 'النصوص غير المعينة (الصفحة',
    'textinsert.assigned_texts': 'النصوص المعينة (الصفحة',
    'textinsert.assign_to_region': 'تعيين للمنطقة (الصفحة',
    'textinsert.no_unassigned_regions': 'لا توجد مناطق غير معينة في الصفحة',
    'textinsert.assigned_to': 'معين إلى:',
    'textinsert.preview_text': 'معاينة النص',
    'textinsert.delete_text': 'حذف النص',
    'textinsert.delete_confirm': 'هل أنت متأكد تمامًا؟',
    'textinsert.delete_warning': 'سيؤدي هذا إلى حذف النص بعنوان',
    'textinsert.delete_warning_end': 'لا يمكن التراجع عن هذا الإجراء.',
    'textinsert.close': 'إغلاق',
    'textinsert.no_text_selected': 'لم يتم تحديد نص للحذف.',
    'textinsert.text_deleted': 'تم حذفه بنجاح.',
    'textinsert.delete_failed': 'فشل في حذف النص.',
    'textinsert.no_document_selected': 'لم يتم تحديد مستند.',
    'textinsert.api_key_not_set': 'مفتاح Gemini API غير مُعيَّن. يرجى تعيينه في الرأس.',
    'textinsert.api_dialog_opened': 'تم فتح مربع حوار إعدادات API. يرجى تكوين مفاتيح API الخاصة بك.',
    'textinsert.system_instructions_empty': 'لا يمكن أن تكون تعليمات النظام فارغة.',
    'textinsert.generating_guidance': 'جارٍ توليد الإرشادات من الصفحة...',
    'textinsert.no_regions_found': 'لم يتم العثور على مناطق في الصفحة',
    'textinsert.add_regions_first': 'يرجى إضافة المناطق أولاً.',
    'textinsert.pdf_not_loaded': 'لم يتم تحميل PDF. يرجى الانتظار قليلاً والمحاولة مرة أخرى.',
    'textinsert.generating_qr': 'جارٍ توليد رموز QR...',
    'textinsert.ai_empty_content': 'أعاد الذكاء الاصطناعي محتوى فارغ.',
    'textinsert.ai_generated_chars': 'ولد الذكاء الاصطناعي',
    'textinsert.characters_content': 'حرفًا من المحتوى',
    'textinsert.guidance_generated_assigned': 'تم توليد إرشادات الذكاء الاصطناعي وتعيينها تلقائيًا إلى',
    'textinsert.regions_text': 'منطقة.',
    'textinsert.guidance_generated_manual': 'تم توليد إرشادات الذكاء الاصطناعي مع',
    'textinsert.texts_assign_manual': 'نصوص. يرجى تعيينها يدويًا.',
    'textinsert.ai_format_error': 'تنسيق استجابة الذكاء الاصطناعي غير متوافق. حاول تعديل تعليمات النظام.',
    'textinsert.enter_text': 'يرجى إدخال بعض النصوص للإدراج',
    'textinsert.no_regions_available': 'لا توجد مناطق متاحة في الصفحة',
    'textinsert.text_assigned_to_regions': 'تم تعيين النص إلى',
    'textinsert.regions_on_page': 'مناطق في الصفحة',
    'textinsert.assignments_undone': 'تم التراجع عن تعيينات النص للصفحة',
    'textinsert.cannot_undo_different_page': 'لا يمكن التراجع عن التعيين من صفحة مختلفة',
    'textinsert.text_unassigned': 'تم إلغاء تعيين النص من المنطقة',
    'textinsert.cannot_assign_different_page': 'لا يمكن تعيين النص لمنطقة في صفحة مختلفة',
    'textinsert.assigned_to_region': 'تم تعيين',
    'textinsert.to_region': 'إلى المنطقة',
    
    // DRM Settings
    'drm.protection': 'إدارة الحقوق الرقمية (DRM)',
    'drm.manage_settings_for': 'إعدادات إدارة الحقوق الرقمية لـ',
    'drm.protect_entire_document': 'حماية المستند بأكمله',
    'drm.select_pages_to_protect': 'اختر الصفحات المراد حمايتها:',
    'drm.page_number': 'صفحة',
    'drm.upgrade_subscription': 'قم بالترقية إلى اشتراك لتمكين إدارة الحقوق الرقمية.',
    'drm.subscriber_required': 'يجب أن تكون مشتركًا لإدارة الحقوق الرقمية.',
    'drm.saving': 'جارٍ الحفظ...',
    'drm.save_changes': 'حفظ التغييرات',
    
    // API Keys
    'api.set_gemini_keys': 'تعيين مفاتيح API Gemini',
    'api.description': 'أضف مفتاح API واحدًا أو أكثر. سيتحول النظام تلقائيًا إلى مفتاح آخر إذا وصل أحدها إلى حده الأقصى. يتم تخزين مفاتيحك في متصفحك فقط. احصل على المفاتيح من',
    'api.google_ai_studio': 'Google AI Studio',
    'api.your_keys': 'مفاتيح API الخاصة بك',
    'api.key_number': 'مفتاح',
    'api.remove_key': 'إزالة المفتاح',
    'api.enter_new_key': 'أدخل مفتاح Gemini API جديدًا',
    'api.add_key': 'إضافة مفتاح',
    'api.save_keys': 'حفظ المفاتيح',
    'api.key_empty_error': 'لا يمكن أن يكون مفتاح API فارغًا.',
    'api.key_exists_error': 'لقد تمت إضافة مفتاح API هذا بالفعل.',
    'api.key_added_info': 'تمت إضافة مفتاح API. انقر على "حفظ المفاتيح" لتثبيت التغييرات.',
    'api.keys_saved_success': 'تم حفظ مفاتيح Gemini API بنجاح.',
    
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
