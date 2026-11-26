import type { FilterCategory, Language, PaymentMethod, ShippingStatus } from '../types';

export const LOYALTY_EARN_AFN_PER_POINT = 100;
export const LOYALTY_POINT_VALUE_AFN = 5;

export const AFGHANISTAN_PROVINCES: Array<{ nameFa: string; namePs: string; feeAfn: number; etaDays: string }> = [
  { nameFa: 'کابل', namePs: 'کابل', feeAfn: 100, etaDays: '24 ساعت / ساعته' },
  { nameFa: 'هرات', namePs: 'هرات', feeAfn: 250, etaDays: '2-3 روز / ورځې' },
  { nameFa: 'بلخ (مزارشریف)', namePs: 'بلخ (مزارشریف)', feeAfn: 250, etaDays: '2-3 روز / ورځې' },
  { nameFa: 'قندهار', namePs: 'کندهار', feeAfn: 280, etaDays: '2-3 روز / ورځې' },
  { nameFa: 'ننگرهار (جلال‌آباد)', namePs: 'ننګرهار (جلال‌اباد)', feeAfn: 200, etaDays: '1-2 روز / ورځې' },
  { nameFa: 'کندز', namePs: 'کندز', feeAfn: 280, etaDays: '2-4 روز / ورځې' },
  { nameFa: 'بغلان', namePs: 'بغلان', feeAfn: 250, etaDays: '2-3 روز / ورځې' },
  { nameFa: 'پروان', namePs: 'پروان', feeAfn: 180, etaDays: '1-2 روز / ورځې' },
  { nameFa: 'غزنی', namePs: 'غزني', feeAfn: 250, etaDays: '2-3 روز / ورځې' },
  { nameFa: 'بامیان', namePs: 'بامیان', feeAfn: 300, etaDays: '3-4 روز / ورځې' },
  { nameFa: 'بدخشان', namePs: 'بدخشان', feeAfn: 350, etaDays: '3-5 روز / ورځې' },
  { nameFa: 'تخار', namePs: 'تخار', feeAfn: 300, etaDays: '3-4 روز / ورځې' },
  { nameFa: 'هلمند', namePs: 'هلمند', feeAfn: 320, etaDays: '3-4 روز / ورځې' },
  { nameFa: 'فراه', namePs: 'فراه', feeAfn: 320, etaDays: '3-4 روز / ورځې' },
  { nameFa: 'نیمروز', namePs: 'نیمروز', feeAfn: 350, etaDays: '3-5 روز / ورځې' },
  { nameFa: 'پکتیا', namePs: 'پکتیا', feeAfn: 250, etaDays: '2-3 روز / ورځې' },
  { nameFa: 'خوست', namePs: 'خوست', feeAfn: 280, etaDays: '2-4 روز / ورځې' },
  { nameFa: 'لوگر', namePs: 'لوګر', feeAfn: 180, etaDays: '1-2 روز / ورځې' },
  { nameFa: 'میدان وردک', namePs: 'میدان وردګ', feeAfn: 180, etaDays: '1-2 روز / ورځې' },
  { nameFa: 'کاپیسا', namePs: 'کاپیسا', feeAfn: 200, etaDays: '1-2 روز / ورځې' },
  { nameFa: 'پنجشیر', namePs: 'پنجشیر', feeAfn: 220, etaDays: '2-3 روز / ورځې' },
  { nameFa: 'لغمان', namePs: 'لغمان', feeAfn: 220, etaDays: '2-3 روز / ورځې' },
  { nameFa: 'کنر', namePs: 'کنړ', feeAfn: 280, etaDays: '2-4 روز / ورځې' },
  { nameFa: 'نورستان', namePs: 'نورستان', feeAfn: 380, etaDays: '4-5 روز / ورځې' },
  { nameFa: 'سمنگان', namePs: 'سمنګان', feeAfn: 280, etaDays: '2-4 روز / ورځې' },
  { nameFa: 'جوزجان', namePs: 'جوزجان', feeAfn: 300, etaDays: '3-4 روز / ورځې' },
  { nameFa: 'سرپل', namePs: 'سرپل', feeAfn: 320, etaDays: '3-4 روز / ورځې' },
  { nameFa: 'فاریاب', namePs: 'فاریاب', feeAfn: 320, etaDays: '3-5 روز / ورځې' },
  { nameFa: 'بادغیس', namePs: 'بادغیس', feeAfn: 350, etaDays: '3-5 روز / ورځې' },
  { nameFa: 'غور', namePs: 'غور', feeAfn: 380, etaDays: '4-6 روز / ورځې' },
  { nameFa: 'دایکندی', namePs: 'دایکندي', feeAfn: 350, etaDays: '3-5 روز / ورځې' },
  { nameFa: 'ارزگان', namePs: 'ارزګان', feeAfn: 350, etaDays: '3-5 روز / ورځې' },
  { nameFa: 'زابل', namePs: 'زابل', feeAfn: 300, etaDays: '3-4 روز / ورځې' },
  { nameFa: 'پکتیکا', namePs: 'پکتیکا', feeAfn: 300, etaDays: '3-4 روز / ورځې' },
];

export const TRANSLATIONS: Record<
  Language,
  {
    brandTitle: string;
    slogan: string;
    promoBanner: string;
    navCollection: string;
    navProducts: string;
    navTrack: string;
    navAccount: string;
    navAdmin: string;
    cartBtn: string;
    heroHeadline: string;
    heroSubhead: string;
    heroCtaProducts: string;
    heroCtaShopNow: string;
    searchPlaceholder: string;
    currency: string;
    categories: Record<FilterCategory, string>;
    inStock: string;
    outOfStock: string;
    discountTag: string;
    newTag: string;
    selectSize: string;
    selectColor: string;
    quantity: string;
    addToCart: string;
    orderWhatsAppDirect: string;
    buyNow: string;
    cartTitle: string;
    emptyCart: string;
    subtotal: string;
    deliveryFee: string;
    total: string;
    checkoutTitle: string;
    fullName: string;
    phoneLabel: string;
    provinceLabel: string;
    addressLabel: string;
    notesLabel: string;
    paymentMethodLabel: string;
    paymentMethods: Record<PaymentMethod, string>;
    paymentDesc: Record<PaymentMethod, string>;
    cardNumberLabel: string;
    cardHolderLabel: string;
    expiryLabel: string;
    confirmOrderBtn: string;
    orderSuccessTitle: string;
    orderCodeLabel: string;
    trackTitle: string;
    trackPlaceholder: string;
    trackBtn: string;
    shippingStatuses: Record<ShippingStatus, string>;
    supportTitle: string;
    supportSubtitle: string;
    supportPlaceholder: string;
    supportSend: string;
    supportWhatsAppBtn: string;
    afghanPhoneTitle: string;
    afghanDeliveryTitle: string;
    codBannerTitle: string;
    adminTitle: string;
    adminSignInPrompt: string;
    signInGoogle: string;
    signOut: string;
    registerTab: string;
    loginTab: string;
    emailLabel: string;
    passwordLabel: string;
    createAccountBtn: string;
    loginBtn: string;
    saveProfileBtn: string;
    myOrdersTitle: string;
    wishlistTitle: string;
    addToWishlist: string;
    removeFromWishlist: string;
    wishlistEmpty: string;
    wishlistLoginPrompt: string;
    reviewsTitle: string;
    noReviewsYet: string;
    ratingLabel: string;
    reviewCommentPlaceholder: string;
    submitReviewBtn: string;
    reviewLoginPrompt: string;
    loyaltyTitle: string;
    loyaltyPointsUnit: string;
    loyaltyBalanceLabel: string;
    loyaltyHowItWorks: string;
    redeemPointsLabel: string;
    useMaxPointsBtn: string;
    clearPointsBtn: string;
    pointsDiscountLabel: string;
    pointsEarnedLabel: string;
    signInForPointsHint: string;
    sizeGuideLink: string;
    sizeGuideTitle: string;
    sortByLabel: string;
    sortOptions: {
      featured: string;
      newest: string;
      priceAsc: string;
      priceDesc: string;
    };
    shareLabel: string;
    shareWhatsApp: string;
    shareTelegram: string;
    copyLink: string;
    linkCopied: string;
    notifyMeBtn: string;
    notifyMeShort: string;
    notifyEmailPlaceholder: string;
    notifySuccessMsg: string;
    notifyInvalidEmail: string;
    quickInquiryBtn: string;
    footerCopyright: string;
  }
> = {
  fa: {
    brandTitle: 'RADMANESH FASHION',
    slogan: 'زیبایی در انتخاب شماست',
    promoBanner:
      'تخفیف ویژه فصل جدید تا ۳۰٪ در رادمنش فیشن · پرداخت نقدی هنگام تحویل در کابل و ۳۴ ولایت افغانستان',
    navCollection: 'کلکسیون',
    navProducts: 'محصولات',
    navTrack: 'پیگیری سفارش',
    navAccount: 'حساب کاربری',
    navAdmin: 'پنل مدیریت',
    cartBtn: 'سبد خرید',
    heroHeadline: 'استایل متفاوت، انتخاب خاص شما',
    heroSubhead:
      'جدیدترین مدل‌های لباس مردانه، زنانه، زمستانی، تابستانی، کفش و لوازم جانبی با کیفیت عالی و قیمت مناسب به افغانی.',
    heroCtaProducts: 'مشاهده محصولات',
    heroCtaShopNow: 'خرید آنلاین',
    searchPlaceholder: 'جستجوی لباس، کفش یا کیف...',
    currency: 'افغانی',
    categories: {
      all: 'همه محصولات',
      men: 'لباس مردانه',
      women: 'لباس زنانه',
      winter: 'لباس زمستانی',
      summer: 'لباس تابستانی',
      shoes: 'کفش و بوت',
      accessories: 'کیف و لوازم جانبی',
      new: 'جدیدترین مدل‌ها',
      sale: 'تخفیف‌دار',
      wishlist: 'علاقه‌مندی‌ها',
    },
    inStock: 'موجود در انبار',
    outOfStock: 'ناموجود',
    discountTag: 'تخفیف ویژه',
    newTag: 'مدل جدید',
    selectSize: 'انتخاب سایز',
    selectColor: 'انتخاب رنگ',
    quantity: 'تعداد',
    addToCart: 'افزودن به سبد خرید',
    orderWhatsAppDirect: 'سفارش سریع در واتساپ',
    buyNow: 'ثبت سفارش',
    cartTitle: 'سبد خرید شما',
    emptyCart: 'سبد خرید شما هنوز خالی است.',
    subtotal: 'جمع محصولات',
    deliveryFee: 'هزینه ارسال',
    total: 'مبلغ قابل پرداخت',
    checkoutTitle: 'ثبت نهایی سفارش در سراسر افغانستان',
    fullName: 'نام و تخلص',
    phoneLabel: 'شماره تماس / واتساپ (افغانستان یا بین‌المللی)',
    provinceLabel: 'ولایت تحویل',
    addressLabel: 'آدرس دقیق (ناحیه، سرک، نمبر خانه)',
    notesLabel: 'یادداشت سفارش (اختیاری)',
    paymentMethodLabel: 'روش پرداخت',
    paymentMethods: {
      cod: 'پرداخت نقدی هنگام تحویل (COD)',
      online: 'درگاه پرداخت امن آنلاین',
      whatsapp: 'ثبت و تأیید از طریق واتساپ',
    },
    paymentDesc: {
      cod: 'هزینه را پس از دریافت و بررسی کالا به پیک بپردازید.',
      online: 'پرداخت فوری با کارت بانکی یا حساب‌پی با رمزنگاری امن.',
      whatsapp: 'ارسال خودکار جزئیات سفارش به پشتیبانی واتساپ +989913809403.',
    },
    cardNumberLabel: 'شماره کارت / حساب‌پی',
    cardHolderLabel: 'نام دارنده حساب',
    expiryLabel: 'تاریخ انقضا',
    confirmOrderBtn: 'ثبت قطعی سفارش',
    orderSuccessTitle: 'سفارش شما با موفقیت ثبت شد',
    orderCodeLabel: 'کد پیگیری سفارش',
    trackTitle: 'پیگیری لحظه‌ای وضعیت مرسوله',
    trackPlaceholder: 'کد سفارش را وارد کنید (مثلاً RF-...)',
    trackBtn: 'جستجوی وضعیت',
    shippingStatuses: {
      pending: 'ثبت شده (در انتظار تأیید)',
      confirmed: 'تأیید شده',
      packed: 'بسته‌بندی در گدام کابل',
      shipped: 'تحویل به پیک / در مسیر ولایت',
      delivered: 'تحویل داده شد',
      cancelled: 'لغو شده',
    },
    supportTitle: 'پشتیبانی آنلاین ۲۴ ساعته',
    supportSubtitle: 'ارتباط مستقیم و دوطرفه با اپراتور و واتساپ رسمی',
    supportPlaceholder: 'سوال خود را بنویسید...',
    supportSend: 'ارسال پیام',
    supportWhatsAppBtn: 'گفتگو در واتساپ (+989913809403)',
    afghanPhoneTitle: 'تماس و واتساپ رسمی فروشگاه',
    afghanDeliveryTitle: 'ارسال سریع به کابل و ۳۴ ولایت',
    codBannerTitle: 'پرداخت نقدی هنگام تحویل و درگاه امن',
    adminTitle: 'پنل مدیریت رادمنش فیشن',
    adminSignInPrompt: 'برای دسترسی به مدیریت محصولات، مرسولات و گزارش فروش، با حساب مدیریت وارد شوید.',
    signInGoogle: 'ورود با گوگل',
    signOut: 'خروج',
    registerTab: 'ثبت‌نام مشتری جدید',
    loginTab: 'ورود به حساب',
    emailLabel: 'ایمیل',
    passwordLabel: 'رمز عبور (حداقل ۶ کاراکتر)',
    createAccountBtn: 'ایجاد حساب کاربری',
    loginBtn: 'ورود به حساب کاربری',
    saveProfileBtn: 'ذخیره مشخصات پروفایل',
    myOrdersTitle: 'تاریخچه سفارش‌های من',
    wishlistTitle: 'لیست علاقه‌مندی‌ها',
    addToWishlist: 'افزودن به علاقه‌مندی‌ها',
    removeFromWishlist: 'حذف از علاقه‌مندی‌ها',
    wishlistEmpty: 'هنوز محصولی به لیست علاقه‌مندی‌ها اضافه نکرده‌اید.',
    wishlistLoginPrompt: 'برای ذخیره محصولات در لیست علاقه‌مندی‌ها، لطفاً وارد حساب کاربری خود شوید.',
    reviewsTitle: 'نظرات و امتیاز مشتریان',
    noReviewsYet: 'هنوز نظری برای این محصول ثبت نشده است. اولین نفر باشید!',
    ratingLabel: 'امتیاز شما',
    reviewCommentPlaceholder: 'تجربه خود از کیفیت پارچه، دوخت و سایز این محصول را بنویسید...',
    submitReviewBtn: 'ثبت نظر و امتیاز',
    reviewLoginPrompt: 'برای ثبت نظر و امتیاز ستاره‌ای، لطفاً وارد حساب کاربری خود شوید.',
    loyaltyTitle: 'باشگاه وفاداری رادمنش فیشن',
    loyaltyPointsUnit: 'امتیاز',
    loyaltyBalanceLabel: 'موجودی امتیاز شما',
    loyaltyHowItWorks: 'هر ۱۰۰ افغانی خرید = ۱ امتیاز · هر ۱ امتیاز = ۵ افغانی تخفیف در سفارش بعدی',
    redeemPointsLabel: 'استفاده از امتیاز برای تخفیف در این سفارش',
    useMaxPointsBtn: 'استفاده از حداکثر امتیاز',
    clearPointsBtn: 'لغو استفاده',
    pointsDiscountLabel: 'تخفیف امتیاز وفاداری',
    pointsEarnedLabel: 'امتیاز دریافتی از این خرید',
    signInForPointsHint: 'با ورود یا ثبت‌نام، از این خرید امتیاز وفاداری دریافت کنید و در خریدها تخفیف بگیرید.',
    sizeGuideLink: 'راهنمای سایز و اندازه‌گیری',
    sizeGuideTitle: 'جدول راهنمای سایز و تبدیل اندازه‌ها',
    sortByLabel: 'مرتب‌سازی:',
    sortOptions: {
      featured: 'پیشنهاد ویژه فروشگاه',
      newest: 'جدیدترین محصولات',
      priceAsc: 'قیمت: از کم به زیاد',
      priceDesc: 'قیمت: از زیاد به کم',
    },
    shareLabel: 'اشتراک‌گذاری با دوستان و خانواده:',
    shareWhatsApp: 'واتساپ',
    shareTelegram: 'تلگرام',
    copyLink: 'کپی لینک',
    linkCopied: 'کپی شد!',
    notifyMeBtn: 'وقتی موجود شد خبرم کن',
    notifyMeShort: 'اطلاع از موجودی',
    notifyEmailPlaceholder: 'ایمیل خود را وارد کنید (example@gmail.com)',
    notifySuccessMsg: 'ایمیل شما ثبت شد! به محض موجود شدن این محصول به شما اطلاع می‌دهیم.',
    notifyInvalidEmail: 'لطفاً یک ایمیل معتبر وارد کنید.',
    quickInquiryBtn: 'استعلام سریع در واتساپ',
    footerCopyright: '© ۲۰۲۶ رادمنش فیشن (Radmanesh Fashion) — تمامی حقوق محفوظ است.',
  },
  ps: {
    brandTitle: 'RADMANESH FASHION',
    slogan: 'ښکلا ستاسو په انتخاب کې ده',
    promoBanner:
      'د نوي فصل ځانګړی تخفیف تر ۳۰٪ پورې په رادمنش فیشن کې · په کابل او د افغانستان په ۳۴ ولایتونو کې د تحویل پر مهال نغدي تادیه',
    navCollection: 'کلکسیون',
    navProducts: 'محصولات',
    navTrack: 'د امر تعقیب',
    navAccount: 'کارن حساب',
    navAdmin: 'مدیریت پنل',
    cartBtn: 'د پیرود کڅوړه',
    heroHeadline: 'متفاوت سټایل، ستاسو ځانګړی انتخاب',
    heroSubhead:
      'د نارینه، ښځینه، ژمني، دوبي، بوټانو او اکسسوریو ترټولو نوي ماډلونه په غوره کیفیت او مناسب افغانی قیمت.',
    heroCtaProducts: 'محصولات وګورئ',
    heroCtaShopNow: 'انلاین پیرود',
    searchPlaceholder: 'د جامو، بوټانو یا بکس لټون...',
    currency: 'افغانۍ',
    categories: {
      all: 'ټول محصولات',
      men: 'د نارینه وو جامې',
      women: 'د ښځینه وو جامې',
      winter: 'ژمنۍ جامې',
      summer: 'دوبي جامې',
      shoes: 'بوټان او چپلکې',
      accessories: 'بکسونه او اکسسوري',
      new: 'نوي ماډلونه',
      sale: 'تخفیف شوي',
      wishlist: 'خوښ شوي',
    },
    inStock: 'په ګودام کې شته',
    outOfStock: 'خلاص شوی',
    discountTag: 'ځانګړی تخفیف',
    newTag: 'نوی ماډل',
    selectSize: 'اندازه وټاکئ',
    selectColor: 'رنګ وټاکئ',
    quantity: 'شمېر',
    addToCart: 'کڅوړې ته زیات کړئ',
    orderWhatsAppDirect: 'په واټساپ مستقیم امر',
    buyNow: 'د امر ثبتول',
    cartTitle: 'ستاسو د پیرود کڅوړه',
    emptyCart: 'ستاسو د پیرود کڅوړه لا خالي ده.',
    subtotal: 'د محصولاتو مجموعه',
    deliveryFee: 'د لېږد لګښت',
    total: 'د تادیې وړ مبلغ',
    checkoutTitle: 'په ټول افغانستان کې د امر ثبتول',
    fullName: 'بشپړ نوم',
    phoneLabel: 'د اړیکې / واټساپ شمېره',
    provinceLabel: 'د تحویل ولایت',
    addressLabel: 'دقیق پته (ناحیه، سړک، د کور شمېره)',
    notesLabel: 'د امر یادښت (اختیاري)',
    paymentMethodLabel: 'د تادیې طریقه',
    paymentMethods: {
      cod: 'د تحویل پر مهال نغدي تادیه (COD)',
      online: 'خوندي انلاین تادیه',
      whatsapp: 'د واټساپ له لارې ثبت او تایید',
    },
    paymentDesc: {
      cod: 'د توکو تر ترلاسه کولو او کتلو وروسته پیسې ورکړئ.',
      online: 'د بانکي کارت یا حساب‌پې له لارې خوندي انلاین تادیه.',
      whatsapp: 'د امر معلومات په اتومات ډول +989913809403 واټساپ ته لېږل کېږي.',
    },
    cardNumberLabel: 'د کارت / حساب‌پې شمېره',
    cardHolderLabel: 'د کارت لرونکي نوم',
    expiryLabel: 'د اعتبار نېټه',
    confirmOrderBtn: 'د امر وروستۍ ثبتونه',
    orderSuccessTitle: 'ستاسو امر په بریالیتوب سره ثبت شو',
    orderCodeLabel: 'د امر د تعقیب کوډ',
    trackTitle: 'د مرسولې حالت ژوندی تعقیب',
    trackPlaceholder: 'د امر کوډ ولیکئ (لکه RF-...)',
    trackBtn: 'حالت وګورئ',
    shippingStatuses: {
      pending: 'ثبت شوی (د تایید په تمه)',
      confirmed: 'تایید شوی',
      packed: 'په کابل ګودام کې بسته شوی',
      shipped: 'پیک / ولایت ته واستول شو',
      delivered: 'وسپارل شو',
      cancelled: 'لغوه شوی',
    },
    supportTitle: '۲۴ ساعته انلاین ملاتړ',
    supportSubtitle: 'له اپراتور او رسمي واټساپ سره دوه اړخیزه اړیکه',
    supportPlaceholder: 'خپله پوښتنه ولیکئ...',
    supportSend: 'پیغام ولېږئ',
    supportWhatsAppBtn: 'په واټساپ خبرې (+989913809403)',
    afghanPhoneTitle: 'د هټۍ رسمي اړیکه او واټساپ',
    afghanDeliveryTitle: 'کابل او ۳۴ ولایتونو ته چټک لېږد',
    codBannerTitle: 'په تحویل نغدي تادیه او خوندي درګاه',
    adminTitle: 'د رادمنش فیشن مدیریت پنل',
    adminSignInPrompt: 'د محصولاتو، مرسولو او پلور راپورونو د مدیریت لپاره د مدیر په حساب ننوځئ.',
    signInGoogle: 'له ګوګل سره ننوتل',
    signOut: 'وتل',
    registerTab: 'د نوي پیرودونکي نوم‌لیکنه',
    loginTab: 'حساب ته ننوتل',
    emailLabel: 'برېښنالیک (Email)',
    passwordLabel: 'پټنوم (لږ تر لږه ۶ توري)',
    createAccountBtn: 'کارن حساب جوړول',
    loginBtn: 'حساب ته ننوتل',
    saveProfileBtn: 'د پروفایل معلومات خوندي کول',
    myOrdersTitle: 'زما د امرونو تاریخچه',
    wishlistTitle: 'د خوښ شویو محصولاتو لېست',
    addToWishlist: 'خوښ شویو ته زیات کړئ',
    removeFromWishlist: 'له خوښ شویو لرې کړئ',
    wishlistEmpty: 'تاسو لا تر اوسه کوم محصول د خوښ شویو لېست ته نه دی زیات کړی.',
    wishlistLoginPrompt: 'د خوښ شویو محصولاتو د خوندي کولو لپاره، مهرباني وکړئ خپل کارن حساب ته ننوځئ.',
    reviewsTitle: 'د پیرودونکو نظرونه او درجه بندي',
    noReviewsYet: 'تر اوسه د دې محصول لپاره کوم نظر نه دی ثبت شوی.',
    ratingLabel: 'ستاسو درجه بندي',
    reviewCommentPlaceholder: 'د دې محصول د ټوکر کیفیت، ګنډلو او اندازې په اړه خپل نظر ولیکئ...',
    submitReviewBtn: 'نظر او ستوري ثبت کړئ',
    reviewLoginPrompt: 'د نظر او ستوري ثبتولو لپاره مهرباني وکړئ خپل حساب ته ننوځئ.',
    loyaltyTitle: 'د رادمنش فیشن د وفادارۍ امتیازونه',
    loyaltyPointsUnit: 'امتیاز',
    loyaltyBalanceLabel: 'ستاسو د امتیازونو موجودي',
    loyaltyHowItWorks: 'هره ۱۰۰ افغانۍ پیرود = ۱ امتیاز · هر ۱ امتیاز = ۵ افغانۍ تخفیف',
    redeemPointsLabel: 'په دې امر کې د تخفیف لپاره امتیاز وکاروئ',
    useMaxPointsBtn: 'تر ټولو ډېر امتیاز وکاروئ',
    clearPointsBtn: 'لغوه کول',
    pointsDiscountLabel: 'د وفادارۍ امتیاز تخفیف',
    pointsEarnedLabel: 'له دې پیرود څخه ترلاسه شوي امتیازونه',
    signInForPointsHint: 'د ننوتلو یا نوم‌لیکنې سره، له دې پیرود څخه امتیاز ترلاسه کړئ او تخفیف واخلئ.',
    sizeGuideLink: 'د اندازې لارښود او چارټ',
    sizeGuideTitle: 'د جامو د اندازې او تبدیل چارټ',
    sortByLabel: 'ترتیب:',
    sortOptions: {
      featured: 'د هټۍ ځانګړی ترتیب',
      newest: 'تر ټولو نوي محصولات',
      priceAsc: 'قیمت: له کم څخه تر ډېره',
      priceDesc: 'قیمت: له ډېر څخه تر کمه',
    },
    shareLabel: 'له ملګرو او کورنۍ سره یې شریک کړئ:',
    shareWhatsApp: 'واټساپ',
    shareTelegram: 'ټیلیګرام',
    copyLink: 'لینک کاپي',
    linkCopied: 'کاپي شو!',
    notifyMeBtn: 'کله چې موجود شي خبر راکړئ',
    notifyMeShort: 'د شتون خبرتیا',
    notifyEmailPlaceholder: 'خپل برېښنالیک ولیکئ (example@gmail.com)',
    notifySuccessMsg: 'ستاسو برېښنالیک ثبت شو! د محصول له موجودېدو سره سم به تاسو ته خبر درکړل شي.',
    notifyInvalidEmail: 'مهرباني وکړئ یو سم برېښنالیک ولیکئ.',
    quickInquiryBtn: 'په واټساپ چټکه پوښتنه',
    footerCopyright: '© ۲۰۲۶ رادمنش فیشن (Radmanesh Fashion) — ټول حقوق خوندي دي.',
  },
};

export function formatAfn(amount: number, lang: Language): string {
  const formatted = new Intl.NumberFormat('en-US').format(Math.round(amount));
  return `${formatted} ${TRANSLATIONS[lang].currency}`;
}

export function buildOrderTrackingWhatsAppMessage(params: {
  orderCode: string;
  customerName: string;
  province: string;
  status: ShippingStatus;
  trackingNumber: string;
  courierName: string;
  totalAfn: number;
}): string {
  const statusLabels: Record<ShippingStatus, string> = {
    pending: 'ثبت شده — در انتظار تأیید',
    confirmed: 'تأیید شده و در حال آماده‌سازی',
    packed: 'بسته‌بندی شده در گدام مرکزی کابل',
    shipped: 'ارسال شده با پیک سریع',
    delivered: 'با موفقیت تحویل داده شد',
    cancelled: 'لغو شده',
  };

  return [
    `سلام ${params.customerName} گرامی،`,
    `اطلاعیه رسمی فروشگاه *رادمنش فیشن (Radmanesh Fashion)*:`,
    `کد سفارش: ${params.orderCode}`,
    `وضعیت مرسوله: *${statusLabels[params.status]}*`,
    `ولایت مقصد: ${params.province}`,
    params.courierName ? `پیک / شرکت انتقالات: ${params.courierName}` : '',
    params.trackingNumber ? `کد رهگیری مرسوله: ${params.trackingNumber}` : '',
    `مبلغ کل: ${new Intl.NumberFormat('en-US').format(params.totalAfn)} افغانی`,
    `برای پیگیری آنلاین یا پرسش، همین‌جا پیام بگذارید. (+989913809403)`,
  ]
    .filter(Boolean)
    .join('\n');
}
