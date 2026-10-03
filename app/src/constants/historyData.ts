export const HISTORY_DATA = [
  {
    id: '1',
    title: 'Cupang Halfmoon Biru Merah',
    date: 'Hari ini, 10:30 WIB',
    result: 'SEHAT',
    image: require('../../assets/images/healthy_halfmoon_1785166203088.png'),
    confidence: 98,
    features: {
      rgb_averages: { r: 120.4, g: 90.2, b: 85.1 },
      glcm: { contrast: 0.852, correlation: 0.912, energy: 0.421, homogeneity: 0.763 }
    }
  },
  {
    id: '2',
    title: 'Cupang Plakat Hijau Metalik',
    date: 'Hari ini, 08:15 WIB',
    result: 'SEHAT',
    image: require('../../assets/images/healthy_plakat_1785166214003.png'),
    confidence: 96,
    features: {
      rgb_averages: { r: 100.1, g: 150.3, b: 90.5 },
      glcm: { contrast: 0.820, correlation: 0.880, energy: 0.450, homogeneity: 0.780 }
    }
  },
  {
    id: '3',
    title: 'Cupang Plakat Hitam',
    date: 'Kemarin, 14:15 WIB',
    result: 'JAMUR',
    image: require('../../assets/images/fungus_betta_1785166221873.png'),
    confidence: 92,
    features: {
      rgb_averages: { r: 180.2, g: 175.4, b: 170.1 }, // Pale colors for fungus
      glcm: { contrast: 1.200, correlation: 0.650, energy: 0.210, homogeneity: 0.450 }
    }
  },
  {
    id: '4',
    title: 'Cupang Halfmoon Silver',
    date: '26 Jul 2026, 09:00 WIB',
    result: 'BUSUK SIRIP',
    image: require('../../assets/images/fin_rot_betta_1785166232872.png'),
    confidence: 94,
    features: {
      rgb_averages: { r: 80.5, g: 85.1, b: 90.2 },
      glcm: { contrast: 1.500, correlation: 0.500, energy: 0.150, homogeneity: 0.350 } // High contrast/rough texture
    }
  },
  {
    id: '5',
    title: 'Cupang Halfmoon Super Red',
    date: '25 Jul 2026, 16:20 WIB',
    result: 'SEHAT',
    image: require('../../assets/images/healthy_halfmoon_1785166203088.png'),
    confidence: 99,
    features: {
      rgb_averages: { r: 200.1, g: 50.2, b: 40.5 },
      glcm: { contrast: 0.800, correlation: 0.920, energy: 0.460, homogeneity: 0.790 }
    }
  },
  {
    id: '6',
    title: 'Cupang Plakat Nemo',
    date: '24 Jul 2026, 11:10 WIB',
    result: 'SEHAT',
    image: require('../../assets/images/healthy_plakat_1785166214003.png'),
    confidence: 95,
    features: {
      rgb_averages: { r: 180.4, g: 120.2, b: 50.1 },
      glcm: { contrast: 0.840, correlation: 0.890, energy: 0.430, homogeneity: 0.750 }
    }
  },
  {
    id: '7',
    title: 'Cupang Crown Tail Merah',
    date: '23 Jul 2026, 08:30 WIB',
    result: 'JAMUR',
    image: require('../../assets/images/fungus_betta_1785166221873.png'),
    confidence: 89,
    features: {
      rgb_averages: { r: 160.2, g: 155.4, b: 150.1 }, 
      glcm: { contrast: 1.150, correlation: 0.680, energy: 0.230, homogeneity: 0.480 }
    }
  },
  {
    id: '8',
    title: 'Cupang Halfmoon Lavender',
    date: '21 Jul 2026, 15:45 WIB',
    result: 'SEHAT',
    image: require('../../assets/images/healthy_halfmoon_1785166203088.png'),
    confidence: 97,
    features: {
      rgb_averages: { r: 140.4, g: 110.2, b: 180.1 },
      glcm: { contrast: 0.830, correlation: 0.900, energy: 0.440, homogeneity: 0.770 }
    }
  },
  {
    id: '9',
    title: 'Cupang Plakat Blue Rim',
    date: '20 Jul 2026, 10:00 WIB',
    result: 'SEHAT',
    image: require('../../assets/images/healthy_plakat_1785166214003.png'),
    confidence: 94,
    features: {
      rgb_averages: { r: 220.1, g: 225.3, b: 240.5 },
      glcm: { contrast: 0.810, correlation: 0.870, energy: 0.420, homogeneity: 0.760 }
    }
  },
  {
    id: '10',
    title: 'Cupang Giant Koi',
    date: '18 Jul 2026, 13:20 WIB',
    result: 'BUSUK SIRIP',
    image: require('../../assets/images/fin_rot_betta_1785166232872.png'),
    confidence: 91,
    features: {
      rgb_averages: { r: 90.5, g: 80.1, b: 70.2 },
      glcm: { contrast: 1.450, correlation: 0.520, energy: 0.160, homogeneity: 0.380 } 
    }
  },
  {
    id: '11',
    title: 'Cupang Halfmoon Mustard Gas',
    date: '15 Jul 2026, 09:15 WIB',
    result: 'SEHAT',
    image: require('../../assets/images/healthy_halfmoon_1785166203088.png'),
    confidence: 96,
    features: {
      rgb_averages: { r: 100.4, g: 140.2, b: 190.1 },
      glcm: { contrast: 0.860, correlation: 0.910, energy: 0.410, homogeneity: 0.740 }
    }
  },
  {
    id: '12',
    title: 'Cupang Plakat Fancy',
    date: '10 Jul 2026, 16:30 WIB',
    result: 'SEHAT',
    image: require('../../assets/images/healthy_plakat_1785166214003.png'),
    confidence: 98,
    features: {
      rgb_averages: { r: 160.1, g: 110.3, b: 130.5 },
      glcm: { contrast: 0.825, correlation: 0.885, energy: 0.445, homogeneity: 0.775 }
    }
  },
];
