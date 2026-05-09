import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import ActionButtons from '../../components/ActionButtons';
import CustomModal from '../../components/CustomModal';
import Template from '../../components/Template';
import { ENV } from '../../config/env';
import { hp, wp } from '../../helpers/common';

type LegalType = 'terms' | 'privacy' | null;
type Language = 'ar' | 'de';

const privacyContent = {
  ar: {
    title: 'سياسة الخصوصية',
    introTitle: 'سياسة الخصوصية',
    introSubtitle:
      'نلتزم بحماية بياناتك الشخصية وفق أعلى معايير الخصوصية المعمول بها في الاتحاد الأوروبي',
    sections: [
      {
        title: 'أساس المعالجة القانونية والشفافية',
        content:
          'تخضع معالجة البيانات في ArabWerk لمبادئ GDPR وBDSG وTDDDG، بما في ذلك مبدأ الشرعية والإنصاف والشفافية، والغاية المحددة، وتوفّر الحد الأدنى من البيانات، والدقة، ومدة الاحتفاظ، والسلامة وسرية المعالجة، والمساءلة.',
      },
      {
        title: 'أنواع البيانات التي يتم جمعها',
        content:
          '• بيانات التسجيل: كالاسم، البريد الإلكتروني.\n• بيانات الاستخدام: مثل سجلات الزيارات وIP والوقت.\n• ملفات تعريف الارتباط وبيانات التتبع حسب الوظيفة.',
      },
      {
        title: 'أغراض المعالجة والقاعدة القانونية',
        content:
          'البيانات تُعالج وفق أحد الأسس القانونية التالية: تنفيذ العقد، المصلحة المشروعة، أو موافقة المستخدم، خصوصًا لملفات تعريف الارتباط غير الأساسية.',
      },
      {
        title: 'الأطراف المتلقية للبيانات',
        content:
          'قد نشارك البيانات مع مزودي خدمات مثل الاستضافة، أدوات التحليل، وإرسال البريد الإلكتروني، ضمن التزام بالحفاظ على السرية والامتثال للتشريعات.',
      },
      {
        title: 'مدة الاحتفاظ بالبيانات',
        content:
          'نحتفظ بالبيانات فقط للمدة اللازمة لتحقيق الغرض منها أو حسب المتطلبات القانونية.',
      },
      {
        title: 'حقوق الأشخاص المعنيين',
        content:
          'للمستخدمين الحق في الوصول إلى بياناتهم، تعديلها، حذفها، تقييد المعالجة أو الاعتراض عليها، سحب الموافقة، نقل البيانات، وتقديم شكوى للسلطة المختصة.',
      },
      {
        title: 'ملفات تعريف الارتباط',
        content:
          'تُستخدم بعض ملفات الكوكيز الأساسية تلقائيًا، أما غير الأساسية مثل التحليل أو الإعلانات فتحتاج إلى موافقة واضحة ومسبقة من المستخدم.',
      },
      {
        title: 'نقل البيانات دوليًا',
        content:
          'في حال نقل البيانات خارج الاتحاد الأوروبي، نضمن اتخاذ تدابير مناسبة مثل الاتفاقيات التعاقدية القياسية لحماية البيانات.',
      },
      {
        title: 'أمن البيانات',
        content:
          'نعتمد إجراءات تقنية وتنظيمية مناسبة مثل التشفير والتحكم بالوصول والنسخ الاحتياطية لحماية البيانات من الضياع أو الاختراق.',
      },
      {
        title: 'التعديلات على سياسة الخصوصية',
        content:
          'نحتفظ بالحق في تعديل هذه السياسة. عند وجود تغييرات جوهرية سنخطرك عبر البريد الإلكتروني أو من خلال تنبيه داخل المنصة.',
      },
    ],
  },
  de: {
    title: 'Datenschutzerklaerung',
    introTitle: 'Datenschutzerklaerung',
    introSubtitle:
      'Wir verpflichten uns, Ihre personenbezogenen Daten gemaess den hoechsten in der Europaeischen Union geltenden Datenschutzstandards zu schuetzen.',
    sections: [
      {
        title: 'Rechtsgrundlage der Verarbeitung und Transparenz',
        content:
          'Die Datenverarbeitung bei ArabWerk unterliegt den Grundsaetzen der DSGVO, des BDSG und des TDDDG, einschliesslich Rechtmaessigkeit, Fairness, Transparenz, Zweckbindung, Datenminimierung und Vertraulichkeit.',
      },
      {
        title: 'Arten der erhobenen Daten',
        content:
          '• Registrierungsdaten wie Name und E-Mail-Adresse.\n• Nutzungsdaten wie Besuchsprotokolle, IP-Adresse und Uhrzeit.\n• Cookies und Tracking-Daten je nach Funktion.',
      },
      {
        title: 'Zwecke der Verarbeitung und Rechtsgrundlage',
        content:
          'Die Verarbeitung erfolgt auf Grundlage von Vertragserfuellung, berechtigtem Interesse oder Einwilligung des Nutzers, insbesondere bei nicht notwendigen Cookies.',
      },
      {
        title: 'Empfaenger der Daten',
        content:
          'Wir koennen Daten an Hosting-Anbieter, Analyse-Tools und E-Mail-Dienstleister weitergeben, unter Wahrung der Vertraulichkeit und der geltenden Vorschriften.',
      },
      {
        title: 'Speicherdauer',
        content:
          'Wir speichern Daten nur so lange, wie es fuer den jeweiligen Zweck erforderlich ist oder gesetzlich vorgeschrieben wird.',
      },
      {
        title: 'Rechte betroffener Personen',
        content:
          'Nutzer haben das Recht auf Auskunft, Berichtigung, Loeschung, Einschraenkung der Verarbeitung, Widerspruch, Widerruf der Einwilligung, Datenuebertragbarkeit und Beschwerde bei der Aufsichtsbehoerde.',
      },
      {
        title: 'Cookies',
        content:
          'Einige technisch notwendige Cookies werden automatisch verwendet. Nicht notwendige Cookies, etwa fuer Analyse oder Werbung, erfordern eine klare vorherige Einwilligung.',
      },
      {
        title: 'Internationale Datenuebermittlung',
        content:
          'Bei einer Uebermittlung ausserhalb der EU stellen wir geeignete Schutzmassnahmen wie Standardvertragsklauseln sicher.',
      },
      {
        title: 'Datensicherheit',
        content:
          'Wir setzen technische und organisatorische Massnahmen wie Verschluesselung, Zugriffskontrollen und Backups ein.',
      },
      {
        title: 'Aenderungen der Datenschutzerklaerung',
        content:
          'Wir behalten uns das Recht vor, diese Richtlinie zu aendern. Bei wesentlichen Aenderungen informieren wir Sie per E-Mail oder ueber einen Hinweis innerhalb der Plattform.',
      },
    ],
  },
};

const termsContent = {
  ar: {
    title: 'شروط الاستخدام',
    introTitle: 'الشروط والأحكام العامة (AGB)',
    introSubtitle: 'يُرجى قراءة هذه الشروط بعناية قبل استخدام منصة ArabWerk',
    sections: [
      {
        title: 'التعاريف العامة',
        content:
          '• المنصة: ArabWerk، وسيط إلكتروني يربط العملاء بمقدمي الخدمات والحرفيين في ألمانيا.\n• العميل: كل شخص طبيعي أو اعتباري يستخدم المنصة لطلب خدمات مشروعة.\n• مقدم الخدمة: كل شخص يقدم خدماته عبر المنصة ملتزمًا بالقوانين الألمانية.\n• المستخدم: أي شخص مسجل في المنصة.',
      },
      {
        title: 'التسجيل والاستخدام',
        content:
          '• التسجيل متاح فقط للبالغين القادرين على التعاقد قانونيًا.\n• يلتزم المستخدم بإدخال بيانات صحيحة وتحديثها.\n• يحق للمنصة تعليق أو إلغاء أي حساب مخالف للشروط.',
      },
      {
        title: 'الاشتراكات',
        content:
          'حساب العميل مجاني دائمًا. أما الحرفيون ومقدمو الخدمات فلديهم اشتراك مجاني وآخر مدفوع. الاشتراك المدفوع يتجدد تلقائيًا ويمنح مزايا إضافية مثل التواصل المباشر وتقديم العروض.',
      },
      {
        title: 'التقييمات',
        content:
          'يحق للعملاء تقييم مقدمي الخدمات بعد تنفيذ المشاريع، ويجب أن تكون التقييمات صادقة وخالية من الإساءة.',
      },
      {
        title: 'المراسلات الداخلية',
        content:
          'الرسائل داخل المنصة مخصصة حصريًا لمناقشة تفاصيل المشاريع ويُمنع استخدامها للإعلانات أو الرسائل غير اللائقة.',
      },
      {
        title: 'حدود المسؤولية',
        content:
          'المنصة ليست طرفًا في العقود ولا تتحمل مسؤولية عن جودة أو تنفيذ الخدمات. يتحمل مقدمو الخدمات المسؤولية القانونية الكاملة عن الأنشطة والخدمات التي يقدمونها.',
      },
      {
        title: 'الملكية الفكرية',
        content:
          'جميع حقوق التصميم والمحتوى والبرمجيات تخص ArabWerk، ويتحمل المستخدم مسؤولية المواد التي يرفعها أو ينشرها.',
      },
      {
        title: 'إنهاء الحساب',
        content:
          'يحق للمستخدم حذف حسابه في أي وقت، وتحتفظ المنصة بحق تعليق أو إلغاء الحساب في حال المخالفات الجسيمة.',
      },
      {
        title: 'القانون الواجب التطبيق',
        content:
          'تخضع هذه الشروط للقانون الألماني، وفي حال وجود تعارض بين النسخة العربية والألمانية يُعتمد النص الألماني.',
      },
    ],
  },
  de: {
    title: 'Nutzungsbedingungen',
    introTitle: 'Allgemeine Geschaeftsbedingungen (AGB)',
    introSubtitle:
      'Bitte lesen Sie diese Bedingungen sorgfaeltig, bevor Sie die ArabWerk-Plattform nutzen.',
    sections: [
      {
        title: 'Allgemeine Definitionen',
        content:
          '• Plattform: ArabWerk, eine elektronische Vermittlungsplattform in Deutschland.\n• Kunde: Jede natuerliche oder juristische Person, die rechtmaessige Dienstleistungen anfragt.\n• Dienstleister: Jede Person, die Leistungen ueber die Plattform anbietet.\n• Nutzer: Jede registrierte Person auf der Plattform.',
      },
      {
        title: 'Registrierung und Nutzung',
        content:
          '• Die Registrierung ist nur volljaehrigen Personen gestattet.\n• Nutzer muessen korrekte Daten angeben und aktuell halten.\n• Die Plattform kann Konten bei Verstoessen sperren oder kuendigen.',
      },
      {
        title: 'Abonnements',
        content:
          'Das Kundenkonto ist kostenlos. Fuer Handwerker und Dienstleister gibt es ein kostenloses sowie ein kostenpflichtiges Abonnement mit erweiterten Funktionen. Das kostenpflichtige Abo verlaengert sich automatisch.',
      },
      {
        title: 'Bewertungen',
        content:
          'Kunden duerfen Dienstleister nach Projektabschluss bewerten. Bewertungen muessen wahrheitsgemaess und frei von beleidigenden Inhalten sein.',
      },
      {
        title: 'Interne Kommunikation',
        content:
          'Nachrichten innerhalb der Plattform dienen ausschliesslich der Besprechung von Projektdetails und duerfen nicht fuer Werbung oder unangemessene Inhalte genutzt werden.',
      },
      {
        title: 'Haftungsbeschraenkung',
        content:
          'Die Plattform ist keine Vertragspartei und uebernimmt keine Verantwortung fuer Qualitaet oder Ausfuehrung der Dienstleistungen. Dienstleister tragen die volle rechtliche Verantwortung.',
      },
      {
        title: 'Geistiges Eigentum',
        content:
          'Saemtliche Rechte an Design, Inhalten und Software stehen ArabWerk zu. Nutzer tragen die Verantwortung fuer hochgeladene Inhalte.',
      },
      {
        title: 'Kontobeendigung',
        content:
          'Nutzer koennen ihr Konto jederzeit loeschen. Die Plattform kann Konten bei schwerwiegenden Verstoessen sperren oder kuendigen.',
      },
      {
        title: 'Anwendbares Recht',
        content:
          'Diese Bedingungen unterliegen deutschem Recht. Im Fall eines Widerspruchs ist die deutsche Fassung massgeblich.',
      },
    ],
  },
};

function LegalModal({
  visible,
  type,
  language,
  onClose,
  onChangeLanguage,
}: {
  visible: boolean;
  type: LegalType;
  language: Language;
  onClose: () => void;
  onChangeLanguage: (lang: Language) => void;
}) {
  if (!type) return null;

  const isArabic = language === 'ar';
  const content = type === 'terms' ? termsContent[language] : privacyContent[language];
  const icon = type === 'terms' ? '📄' : '🔐';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={[styles.modalHeader, { flexDirection: isArabic ? 'row' : 'row-reverse' }]}>
            <Pressable style={styles.modalCloseBtn} onPress={onClose}>
              <Ionicons name="close" size={wp(5.5)} color="#1F2937" />
            </Pressable>

            <Text style={styles.modalTitle}>{content.title}</Text>

            <View style={styles.modalSpacer} />
          </View>

          <View style={styles.languageSwitch}>
            <Pressable
              style={[styles.langBtn, language === 'ar' && styles.langBtnActive]}
              onPress={() => onChangeLanguage('ar')}
            >
              <Text style={[styles.langBtnText, language === 'ar' && styles.langBtnTextActive]}>
                العربية
              </Text>
            </Pressable>

            <Pressable
              style={[styles.langBtn, language === 'de' && styles.langBtnActive]}
              onPress={() => onChangeLanguage('de')}
            >
              <Text style={[styles.langBtnText, language === 'de' && styles.langBtnTextActive]}>
                Deutsch
              </Text>
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalScrollContent}
          >
            <View style={styles.legalIntroCard}>
              <Text style={styles.legalIntroIcon}>{icon}</Text>
              <Text
                style={[
                  styles.legalIntroTitle,
                  { writingDirection: isArabic ? 'rtl' : 'ltr' },
                ]}
              >
                {content.introTitle}
              </Text>
              <Text
                style={[
                  styles.legalIntroSubtitle,
                  { writingDirection: isArabic ? 'rtl' : 'ltr' },
                ]}
              >
                {content.introSubtitle}
              </Text>
            </View>

            {content.sections.map((section, index) => (
              <View key={index} style={styles.legalSectionCard}>
                <View
                  style={[
                    styles.legalSectionTitleRow,
                    { flexDirection: isArabic ? 'row-reverse' : 'row' },
                  ]}
                >
                  <View style={styles.legalSectionNumberBadge}>
                    <Text style={styles.legalSectionNumberText}>{index + 1}</Text>
                  </View>
                  <Text
                    style={[
                      styles.legalSectionTitle,
                      {
                        textAlign: isArabic ? 'right' : 'left',
                        writingDirection: isArabic ? 'rtl' : 'ltr',
                      },
                    ]}
                  >
                    {section.title}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.legalSectionContent,
                    {
                      textAlign: isArabic ? 'right' : 'left',
                      writingDirection: isArabic ? 'rtl' : 'ltr',
                    },
                  ]}
                >
                  {section.content}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function SignupScreen() {
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'success' | 'error' | 'loading' | 'warning'>('success');
  const [modalMessage, setModalMessage] = useState('');

  const [city, setCity] = useState('');
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const cityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [legalModal, setLegalModal] = useState<LegalType>(null);
  const [legalLanguage, setLegalLanguage] = useState<Language>('ar');

  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const cityRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const fetchCitySuggestions = async (query: string) => {
    if (!query || query.trim().length < 2) {
      setCitySuggestions([]);
      setShowCitySuggestions(false);
      return;
    }
    setIsLoadingCities(true);
    try {
      const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(
        query
      )}&type=city&filter=countrycode:de&limit=10&lang=en&apiKey=${ENV.GEOAPIFY_API_KEY}`;
      const response = await fetch(url);
      if (!response.ok) {
        setCitySuggestions([]);
        setShowCitySuggestions(false);
        return;
      }
      const data = await response.json();
      const cities =
        data?.features
          ?.map((f: any) => f?.properties?.city)
          .filter((c: string | null | undefined) => Boolean(c)) ?? [];
      const uniqueCities = Array.from(new Set(cities)).sort() as string[];
      setCitySuggestions(uniqueCities);
      setShowCitySuggestions(uniqueCities.length > 0);
    } catch (error) {
      console.error('Error fetching cities:', error);
      setCitySuggestions([]);
      setShowCitySuggestions(false);
    } finally {
      setIsLoadingCities(false);
    }
  };

  const handleCityChange = (text: string) => {
    setCity(text);
    setSelectedCity(null);
    if (cityTimeoutRef.current) clearTimeout(cityTimeoutRef.current);
    cityTimeoutRef.current = setTimeout(() => fetchCitySuggestions(text), 500);
  };

  const handleCitySelect = (selectedCityName: string) => {
    setCity(selectedCityName);
    setSelectedCity(selectedCityName);
    setShowCitySuggestions(false);
    setCitySuggestions([]);
    Keyboard.dismiss();
  };

  useEffect(() => {
    return () => {
      if (cityTimeoutRef.current) clearTimeout(cityTimeoutRef.current);
    };
  }, []);

  const validateForm = () => {
    if (!firstName.trim()) {
      setModalType('warning');
      setModalMessage('يرجى إدخال الاسم الأول');
      setModalVisible(true);
      return false;
    }
    if (!lastName.trim()) {
      setModalType('warning');
      setModalMessage('يرجى إدخال اسم العائلة');
      setModalVisible(true);
      return false;
    }
    if (!email.trim() || !email.includes('@')) {
      setModalType('warning');
      setModalMessage('يرجى إدخال بريد إلكتروني صحيح');
      setModalVisible(true);
      return false;
    }
    if (!selectedCity) {
      setModalType('warning');
      setModalMessage('يرجى اختيار مدينة من القائمة');
      setModalVisible(true);
      return false;
    }
    if (!password || password.length < 6) {
      setModalType('warning');
      setModalMessage('يجب أن تكون كلمة المرور 6 أحرف على الأقل');
      setModalVisible(true);
      return false;
    }
    if (password !== confirmPassword) {
      setModalType('warning');
      setModalMessage('كلمتا المرور غير متطابقتين');
      setModalVisible(true);
      return false;
    }
    return true;
  };

  const handleSignup = async () => {
    Keyboard.dismiss();
    if (!validateForm()) return;

    setModalType('loading');
    setModalMessage('جاري التحقق من بياناتك...');
    setModalVisible(true);
    setLoading(true);

    try {
      const checkResponse = await fetch(`${ENV.API_BASE_URL}/users/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      if (checkResponse.ok) {
        const { exists } = await checkResponse.json();
        if (exists) {
          setLoading(false);
          setModalType('error');
          setModalMessage('هذا البريد الإلكتروني مسجل بالفعل. يرجى استخدام بريد آخر.');
          setModalVisible(true);
          return;
        }
      }

      const signupData = {
        firstname: firstName.trim(),
        lastname: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim() || null,
        city: selectedCity,
      };

      await SecureStore.setItemAsync('signup_data', JSON.stringify(signupData));
      await SecureStore.setItemAsync('user_city', selectedCity || '');

      setModalVisible(false);
      setLoading(false);

      router.push('/(auth)/role-selection');
    } catch (error) {
      console.error('Signup error:', error);
      setLoading(false);
      setModalType('error');
      setModalMessage('حدث خطأ في الشبكة. يرجى المحاولة مجدداً.');
      setModalVisible(true);
    }
  };

  return (
    <Template bg="#FFFFFF">
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? hp(2) : 0}
      >
        <StatusBar style="dark" />
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          >
            <View style={styles.logoSection}>
              <View style={styles.logoIcon}>
                <Image
                  source={require('../../assets/images/logo.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.logoText}>ArabWerk</Text>
              <Text style={styles.welcomeText}>إنشاء حساب</Text>
              <Text style={styles.subtitle}>انضم إلى مجتمعنا اليوم</Text>
            </View>

            <View style={styles.formSection}>
              <View style={styles.nameRow}>
                <View style={[styles.inputContainer, styles.nameField]}>
                  <Text style={styles.label}>الاسم الأول</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="الاسم الأول"
                      placeholderTextColor="#9CA3AF"
                      value={firstName}
                      onChangeText={setFirstName}
                      autoCapitalize="words"
                      editable={!loading}
                      returnKeyType="next"
                      textAlign="right"
                      onSubmitEditing={() => lastNameRef.current?.focus()}
                      blurOnSubmit={false}
                    />
                  </View>
                </View>

                <View style={[styles.inputContainer, styles.nameField]}>
                  <Text style={styles.label}>اسم العائلة</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      ref={lastNameRef}
                      style={styles.input}
                      placeholder="اسم العائلة"
                      placeholderTextColor="#9CA3AF"
                      value={lastName}
                      onChangeText={setLastName}
                      autoCapitalize="words"
                      editable={!loading}
                      returnKeyType="next"
                      textAlign="right"
                      onSubmitEditing={() => emailRef.current?.focus()}
                      blurOnSubmit={false}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>البريد الإلكتروني</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    ref={emailRef}
                    style={styles.input}
                    placeholder="أدخل بريدك الإلكتروني"
                    placeholderTextColor="#9CA3AF"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    editable={!loading}
                    returnKeyType="next"
                    textAlign="right"
                    onSubmitEditing={() => cityRef.current?.focus()}
                    blurOnSubmit={false}
                  />
                  <Text style={styles.inputIcon}>📧</Text>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>المدينة (ألمانيا)</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    ref={cityRef}
                    style={styles.input}
                    placeholder="اختر مدينة في ألمانيا"
                    placeholderTextColor="#9CA3AF"
                    value={city}
                    onChangeText={handleCityChange}
                    autoCapitalize="words"
                    editable={!loading}
                    returnKeyType="next"
                    textAlign="right"
                    onFocus={() => {
                      scrollViewRef.current?.scrollTo({ y: hp(20), animated: true });
                    }}
                  />
                  {isLoadingCities ? (
                    <ActivityIndicator size="small" color="#2F6FDB" />
                  ) : (
                    <Text style={styles.inputIcon}>📍</Text>
                  )}
                </View>

                {showCitySuggestions && citySuggestions.length > 0 && (
                  <View style={styles.suggestionsContainer}>
                    <FlatList
                      data={citySuggestions}
                      keyExtractor={(item, index) => `${item}-${index}`}
                      renderItem={({ item }) => (
                        <Pressable
                          style={({ pressed }) => [
                            styles.suggestionItem,
                            pressed && styles.suggestionItemPressed,
                          ]}
                          onPress={() => handleCitySelect(item)}
                        >
                          <Text style={styles.suggestionText}>{item}</Text>
                          <Text style={styles.suggestionIcon}>📍</Text>
                        </Pressable>
                      )}
                      style={styles.suggestionsList}
                      nestedScrollEnabled
                      keyboardShouldPersistTaps="handled"
                    />
                  </View>
                )}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  رقم الهاتف <Text style={styles.optionalTag}>(اختياري)</Text>
                </Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    ref={phoneRef}
                    style={styles.input}
                    placeholder="أدخل رقم هاتفك"
                    placeholderTextColor="#9CA3AF"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    editable={!loading}
                    returnKeyType="next"
                    textAlign="right"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    blurOnSubmit={false}
                    onFocus={() => {
                      scrollViewRef.current?.scrollTo({ y: hp(35), animated: true });
                    }}
                  />
                  <Text style={styles.inputIcon}>📱</Text>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>كلمة المرور</Text>
                <View style={styles.inputWrapper}>
                  <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                    disabled={loading}
                  >
                    <Text style={styles.eyeIconText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                  </Pressable>
                  <TextInput
                    ref={passwordRef}
                    style={styles.input}
                    placeholder="أنشئ كلمة مرور"
                    placeholderTextColor="#9CA3AF"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    editable={!loading}
                    returnKeyType="next"
                    textAlign="right"
                    onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                    blurOnSubmit={false}
                    onFocus={() => {
                      scrollViewRef.current?.scrollTo({ y: hp(50), animated: true });
                    }}
                  />
                  <Text style={styles.inputIcon}>🔒</Text>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>تأكيد كلمة المرور</Text>
                <View style={styles.inputWrapper}>
                  <Pressable
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeIcon}
                    disabled={loading}
                  >
                    <Text style={styles.eyeIconText}>
                      {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                    </Text>
                  </Pressable>
                  <TextInput
                    ref={confirmPasswordRef}
                    style={styles.input}
                    placeholder="أعد إدخال كلمة المرور"
                    placeholderTextColor="#9CA3AF"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    editable={!loading}
                    returnKeyType="done"
                    textAlign="right"
                    onSubmitEditing={handleSignup}
                    onFocus={() => {
                      scrollViewRef.current?.scrollTo({ y: hp(60), animated: true });
                    }}
                  />
                  <Text style={styles.inputIcon}>🔒</Text>
                </View>
              </View>

              <View style={styles.termsSection}>
                <Text style={styles.termsText}>
                  بالتسجيل، أنت توافق على{' '}
                  <Text style={styles.termsLink} onPress={() => setLegalModal('terms')}>
                    شروط الاستخدام
                  </Text>{' '}
                  و{' '}
                  <Text style={styles.termsLink} onPress={() => setLegalModal('privacy')}>
                    سياسة الخصوصية
                  </Text>
                </Text>
              </View>

              <View style={styles.buttonContainer}>
                <ActionButtons
                  text={loading ? 'جاري إنشاء الحساب...' : 'إنشاء الحساب'}
                  backgroundColor={loading ? '#9CA3AF' : '#2F6FDB'}
                  textColor="#FFFFFF"
                  showShadow={!loading}
                  onPress={handleSignup}
                  disabled={loading}
                />
              </View>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>أو</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.loginSection}>
                <Pressable onPress={() => router.push('/(auth)/login')} disabled={loading}>
                  <Text style={styles.loginLink}>تسجيل الدخول</Text>
                </Pressable>
                <Text style={styles.loginText}> هل لديك حساب بالفعل؟</Text>
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      <CustomModal
        visible={modalVisible}
        type={modalType}
        message={modalMessage}
        onClose={() => setModalVisible(false)}
        showCloseButton={modalType !== 'loading'}
      />

      <LegalModal
        visible={legalModal !== null}
        type={legalModal}
        language={legalLanguage}
        onChangeLanguage={setLegalLanguage}
        onClose={() => setLegalModal(null)}
      />
    </Template>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: hp(8), paddingHorizontal: wp(6) },

  logoSection: { alignItems: 'center', marginBottom: hp(3) },
  logoIcon: {
    width: wp(15),
    height: wp(15),
    borderRadius: wp(7.5),
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: hp(1.5),
  },
  logoImage: { width: '80%', height: '80%' },
  logoText: { fontSize: wp(8), fontWeight: 'bold', color: '#2F6FDB', marginBottom: hp(0.8) },
  welcomeText: { fontSize: wp(5.5), fontWeight: '700', color: '#1F2937', marginBottom: hp(0.5) },
  subtitle: { fontSize: wp(3.5), color: '#6B7280' },

  formSection: { flex: 1 },

  nameRow: { flexDirection: 'row', gap: wp(3) },
  nameField: { flex: 1, marginBottom: hp(2) },

  inputContainer: { marginBottom: hp(2), position: 'relative' },
  label: {
    fontSize: wp(3.5),
    fontWeight: '600',
    color: '#374151',
    marginBottom: hp(0.8),
    textAlign: 'right',
  },
  optionalTag: { fontSize: wp(3), fontWeight: '400', color: '#9CA3AF' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingHorizontal: wp(3),
    height: hp(6),
  },
  inputIcon: { fontSize: wp(4.5), marginLeft: wp(2) },
  input: { flex: 1, fontSize: wp(3.8), color: '#1F2937' },
  eyeIcon: { padding: wp(2) },
  eyeIconText: { fontSize: wp(4.5) },

  suggestionsContainer: {
    marginTop: hp(0.5),
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    maxHeight: hp(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  suggestionsList: { maxHeight: hp(20) },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(4),
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  suggestionItemPressed: { backgroundColor: '#EEF5FF' },
  suggestionIcon: { fontSize: wp(4), marginLeft: wp(2) },
  suggestionText: { fontSize: wp(3.8), color: '#1F2937', textAlign: 'right' },

  termsSection: { marginTop: hp(1), marginBottom: hp(2.5) },
  termsText: { fontSize: wp(3.2), color: '#6B7280', textAlign: 'center', lineHeight: hp(2.2) },
  termsLink: { color: '#2F6FDB', fontWeight: '600' },

  buttonContainer: { marginBottom: hp(2.5) },

  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: hp(2.5) },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { marginHorizontal: wp(4), fontSize: wp(3.5), color: '#9CA3AF', fontWeight: '500' },

  loginSection: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: hp(1) },
  loginText: { fontSize: wp(3.5), color: '#6B7280' },
  loginLink: { fontSize: wp(3.5), color: '#2F6FDB', fontWeight: '700' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.32)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    height: hp(88),
    backgroundColor: '#F9FAFB',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  modalHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingTop: hp(2.2),
    paddingBottom: hp(1.8),
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalCloseBtn: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(5),
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: wp(4.8),
    fontWeight: '800',
    color: '#1F2937',
  },
  modalSpacer: {
    width: wp(10),
  },

  languageSwitch: {
    flexDirection: 'row',
    gap: wp(3),
    paddingHorizontal: wp(4),
    paddingTop: hp(1.4),
    paddingBottom: hp(1),
    backgroundColor: '#F9FAFB',
  },
  langBtn: {
    flex: 1,
    paddingVertical: hp(1.2),
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
  },
  langBtnActive: {
    backgroundColor: '#2F6FDB',
  },
  langBtnText: {
    fontSize: wp(3.6),
    fontWeight: '700',
    color: '#374151',
  },
  langBtnTextActive: {
    color: '#FFFFFF',
  },

  modalScrollContent: {
    padding: wp(4),
    paddingBottom: hp(10),
  },
  legalIntroCard: {
    backgroundColor: '#2F6FDB',
    borderRadius: 16,
    padding: wp(5),
    alignItems: 'center',
    marginBottom: hp(2.5),
  },
  legalIntroIcon: {
    fontSize: wp(10),
    marginBottom: hp(1),
  },
  legalIntroTitle: {
    fontSize: wp(5),
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: hp(0.8),
  },
  legalIntroSubtitle: {
    fontSize: wp(3.5),
    color: 'rgba(255,255,255,0.88)',
    textAlign: 'center',
    lineHeight: wp(5.5),
  },

  legalSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: wp(4),
    marginBottom: hp(1.8),
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  legalSectionTitleRow: {
    alignItems: 'center',
    marginBottom: hp(1.3),
    gap: wp(2),
  },
  legalSectionNumberBadge: {
    width: wp(7),
    height: wp(7),
    borderRadius: wp(3.5),
    backgroundColor: '#EEF5FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  legalSectionNumberText: {
    fontSize: wp(3.4),
    fontWeight: '700',
    color: '#2F6FDB',
  },
  legalSectionTitle: {
    flex: 1,
    fontSize: wp(4.1),
    fontWeight: '700',
    color: '#1F2937',
  },
  legalSectionContent: {
    fontSize: wp(3.5),
    color: '#4B5563',
    lineHeight: wp(5.8),
  },
});
