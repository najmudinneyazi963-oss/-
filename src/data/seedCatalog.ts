import type { Product } from '../types';

export const STUDIO_IMAGE_PRESETS = [
  {
    label: 'بلیزر رسمی مردانه (مشکی)',
    url: '/src/assets/images/prod_mens_blazer_1795653193790.jpg',
  },
  {
    label: 'ترنچ کت کشمیر زنانه',
    url: '/src/assets/images/prod_womens_trench_1795653194327.jpg',
  },
  {
    label: 'کت زمستانی پشمی و چرم',
    url: '/src/assets/images/prod_winter_jacket_1795653195098.jpg',
  },
  {
    label: 'ست کتان تابستانی',
    url: '/src/assets/images/prod_summer_linen_1795653195304.jpg',
  },
  {
    label: 'بوت چرم چلسي دست‌دوز',
    url: '/src/assets/images/prod_chelsea_boots_1795653195052.jpg',
  },
  {
    label: 'کیف چرم و کمربند قفل طلایی',
    url: '/src/assets/images/prod_luxury_handbag_1795653196436.jpg',
  },
  {
    label: 'پیراهن مجلسی گلدوزی طلایی',
    url: '/src/assets/images/prod_evening_gown_1795653196979.jpg',
  },
];

export const HERO_BANNER_IMAGE = '/src/assets/images/hero_radmanesh_luxury_1795653194070.jpg';

export const SEED_PRODUCTS: Product[] = [
  {
    id: 'rf_mens_blazer_01',
    nameDari: 'بلیزر پشمی دو دکمه امپراتور',
    namePashto: 'د امپراتور دوه تڼیو وړین بلیزر',
    descriptionDari:
      'دوخت سفارشی با پارچه پشمی اعلا و دکمه‌های ظریف، مناسب محافل رسمی و استایل لوکس مردانه.',
    descriptionPashto:
      'د لوړ کیفیت وړین ټوکر او ظریفو تڼیو سره ځانګړی ګنډل، د رسمي غونډو او لوکس نارینه سټایل لپاره.',
    category: 'men',
    priceAfn: 8500,
    discountPriceAfn: 6900,
    stock: 18,
    sizes: ['M', 'L', 'XL', 'XXL'],
    colors: ['مشکی کلاسیک', 'سرمه‌ای تیره'],
    imageUrl: '/src/assets/images/prod_mens_blazer_1795653193790.jpg',
    isNew: true,
    isFeatured: true,
  },
  {
    id: 'rf_womens_trench_02',
    nameDari: 'پالتو ترنچ کشمیر شتری با شال ابریشم',
    namePashto: 'د اوښ رنګ کشمیري ښځینه پالتو له ورېښمین شال سره',
    descriptionDari:
      'پالتو کشمیر لطیف زنانه همراه با کمربند قفل طلایی و شال ابریشم مشکی، طراحی شده برای بانوان شیک‌پوش.',
    descriptionPashto:
      'نرم کشمیري ښځینه پالتو له طلایی قلف لرونکي کمربند او تور ورېښمین شال سره.',
    category: 'women',
    priceAfn: 9200,
    discountPriceAfn: 7450,
    stock: 14,
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['شتری طلایی', 'مشکی'],
    imageUrl: '/src/assets/images/prod_womens_trench_1795653194327.jpg',
    isNew: true,
    isFeatured: true,
  },
  {
    id: 'rf_winter_shearling_03',
    nameDari: 'اورکت زمستانی آستر پوستین و چرم',
    namePashto: 'ژمنی پوستین او چرم لرونکی اورکوټ',
    descriptionDari:
      'محافظت کامل در برابر سرمای زمستان کابل و ولایات با آستر نرم و یقه چرم طبیعی.',
    descriptionPashto:
      'د کابل او ولایتونو د ژمي سړې هوا پر وړاندې بشپړه تودوخه له نرم استر او طبیعي چرم کالر سره.',
    category: 'winter',
    priceAfn: 11500,
    discountPriceAfn: 0,
    stock: 11,
    sizes: ['M', 'L', 'XL'],
    colors: ['مشکی مات', 'قهوه‌ای تیره'],
    imageUrl: '/src/assets/images/prod_winter_jacket_1795653195098.jpg',
    isNew: true,
    isFeatured: true,
  },
  {
    id: 'rf_summer_linen_04',
    nameDari: 'ست پیراهن و پطلون کتان تابستانی',
    namePashto: 'د دوبي کتان کمیس او پتلون سیټ',
    descriptionDari:
      'پارچه کتان خالص تنفس‌پذیر و سبک، ایده‌آل برای روزهای گرم تابستان با برش مدرن و راحت.',
    descriptionPashto:
      'خالص او سپک تنفسي کتان ټوکر، د دوبي تودو ورځو لپاره مناسب له عصري پرې کولو سره.',
    category: 'summer',
    priceAfn: 4400,
    discountPriceAfn: 3650,
    stock: 25,
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['عاجی روشن', 'خاکی طلایی'],
    imageUrl: '/src/assets/images/prod_summer_linen_1795653195304.jpg',
    isNew: false,
    isFeatured: true,
  },
  {
    id: 'rf_chelsea_boots_05',
    nameDari: 'بوت چرم گاوی دست‌دوز چلسي',
    namePashto: 'لاسي ګنډل شوي د چلسي خالص چرم بوټان',
    descriptionDari:
      'کفش و بوت تمام چرم طبیعی با تخت دست‌دوز و دوام عالی، مناسب استفاده رسمی و روزمره.',
    descriptionPashto:
      'د خالص طبیعي چرم او لاسي ګنډل شوي تلې سره لوړ پایښت لرونکي بوټان.',
    category: 'shoes',
    priceAfn: 5800,
    discountPriceAfn: 4950,
    stock: 16,
    sizes: ['40', '41', '42', '43', '44'],
    colors: ['مشکی چرمی', 'قهوه‌ای سوخته'],
    imageUrl: '/src/assets/images/prod_chelsea_boots_1795653195052.jpg',
    isNew: true,
    isFeatured: true,
  },
  {
    id: 'rf_luxury_handbag_06',
    nameDari: 'ست کیف چرم سافیانو و کمربند طلایی',
    namePashto: 'د سافیانو چرم بکس او طلایی کمربند سیټ',
    descriptionDari:
      'کیف دستی ساختاریافته با قفل فلزی طلایی برس‌خورده همراه با کمربند ست چرم طبیعی.',
    descriptionPashto:
      'د برش شوي طلایی قلف لرونکی کلک لاسي بکس له خالص چرم کمربند سره.',
    category: 'accessories',
    priceAfn: 6400,
    discountPriceAfn: 0,
    stock: 19,
    sizes: ['تک سایز'],
    colors: ['مشکی طلایی'],
    imageUrl: '/src/assets/images/prod_luxury_handbag_1795653196436.jpg',
    isNew: true,
    isFeatured: true,
  },
  {
    id: 'rf_evening_gown_07',
    nameDari: 'پیراهن مجلسی گلدوزی نخ طلا',
    namePashto: 'د طلایی تار ګلدوزۍ مجلسی ښځینه کمیس',
    descriptionDari:
      'طراحی اختصاصی رادمنش فیشن با گلدوزی ظریف نخ طلا روی حریر مشکی، مناسب عروسی و مهمانی‌های خاص.',
    descriptionPashto:
      'د رادمنش فیشن ځانګړې ډیزاین په تور ورېښمو باندې د طلایی تار په ظریفه ګلدوزۍ سره.',
    category: 'women',
    priceAfn: 12800,
    discountPriceAfn: 9900,
    stock: 8,
    sizes: ['S', 'M', 'L'],
    colors: ['مشکی و طلایی'],
    imageUrl: '/src/assets/images/prod_evening_gown_1795653196979.jpg',
    isNew: true,
    isFeatured: true,
  },
  {
    id: 'rf_mens_winter_boots_08',
    nameDari: 'پکیج زمستانی استایل مردانه رادمنش',
    namePashto: 'د رادمنش نارینه ژمنی ځانګړی سټایل',
    descriptionDari:
      'ترکیب پالتو پشمی گرم و پارچه تنفسی اعلا با دوخت استاندارد برای آقایان خوش‌سلیقه.',
    descriptionPashto:
      'د تود وړین پالتو او غوره ټوکر ترکیب د ښکلي سټایل لرونکو نارینه وو لپاره.',
    category: 'men',
    priceAfn: 7600,
    discountPriceAfn: 6200,
    stock: 12,
    sizes: ['M', 'L', 'XL'],
    colors: ['ذغالی تیره', 'مشکی'],
    imageUrl: '/src/assets/images/prod_winter_jacket_1795653195098.jpg',
    isNew: false,
    isFeatured: true,
  },
];
