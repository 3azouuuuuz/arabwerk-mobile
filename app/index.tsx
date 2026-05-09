import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { hp, wp } from '../helpers/common';

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
          '• بيانات التسجيل: كالاسم، البريد الإلكتروني...\n• بيانات الاستخدام: مثل سجلات الزيارات، IP، الوقت، الصفحات المُطبقة...\n• ملفات تعريف الارتباط وبيانات التتبع حسب الوظيفة.',
      },
      {
        title: 'أغراض المعالجة والقاعدة القانونية',
        content:
          'البيانات تُعالج وفق أحد الأسس القانونية التالية:\n• تنفيذ العقد.\n• مصلحة مشروعة.\n• موافقة المستخدم، خصوصًا لملفات تعريف الارتباط غير الأساسية.',
      },
      {
        title: 'الأطراف المتلقية للبيانات',
        content:
          'قد نشارك البيانات مع مزودي خدمات مثل الاستضافة، أدوات التحليل، وإرسال البريد الإلكتروني، ضمن التزام بالحفاظ على السرية والامتثال للتشريعات.',
      },
      {
        title: 'مدة الاحتفاظ بالبيانات',
        content:
          'نحتفظ بالبيانات فقط للمدة اللازمة لتحقيق الغرض منها، مثل حذف بيانات النشاط بعد 12 شهرًا من عدم الاستخدام أو حسب المتطلبات القانونية.',
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
          'Die Datenverarbeitung bei ArabWerk unterliegt den Grundsaetzen der DSGVO, des BDSG und des TDDDG, einschliesslich Rechtmaessigkeit, Fairness, Transparenz, Zweckbindung, Datenminimierung, Richtigkeit, Speicherbegrenzung sowie Integritaet und Vertraulichkeit.',
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
          'Wir speichern Daten nur so lange, wie es fuer den jeweiligen Zweck erforderlich ist, etwa Aktivitaetsdaten bis zu 12 Monate nach Inaktivitaet oder gemaess gesetzlicher Vorgaben.',
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
            <View style={styles.introCard}>
              <Text style={styles.introIcon}>{icon}</Text>
              <Text
                style={[
                  styles.introTitle,
                  { writingDirection: isArabic ? 'rtl' : 'ltr' },
                ]}
              >
                {content.introTitle}
              </Text>
              <Text
                style={[
                  styles.introSubtitle,
                  { writingDirection: isArabic ? 'rtl' : 'ltr' },
                ]}
              >
                {content.introSubtitle}
              </Text>
            </View>

            {content.sections.map((section, index) => (
              <View key={index} style={styles.sectionCard}>
                <View
                  style={[
                    styles.sectionTitleRow,
                    { flexDirection: isArabic ? 'row-reverse' : 'row' },
                  ]}
                >
                  <View style={styles.sectionNumberBadge}>
                    <Text style={styles.sectionNumberText}>{index + 1}</Text>
                  </View>
                  <Text
                    style={[
                      styles.sectionTitle,
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
                    styles.sectionContent,
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

export default function WelcomeScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const card1Anim = useRef(new Animated.Value(0)).current;
  const card2Anim = useRef(new Animated.Value(0)).current;

  const [legalModal, setLegalModal] = useState<LegalType>(null);
  const [language, setLanguage] = useState<Language>('ar');

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(scaleAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
      Animated.stagger(150, [
        Animated.timing(card1Anim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(card2Anim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }, [card1Anim, card2Anim, fadeAnim, scaleAnim, slideAnim]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.bgBlob1} />
      <View style={styles.bgBlob2} />
      <View style={styles.bgBlob3} />

      <Animated.View
        style={[
          styles.heroSection,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.logoRing}>
          <View style={styles.logoInner}>
            <Image
              source={require('../assets/images/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </View>

        <Text style={styles.brandName}>ArabWerk</Text>

        <View style={styles.taglineContainer}>
          <Text style={styles.tagline}>المنصة التي تربط العملاء بالحرفيين</Text>
          <Text style={styles.tagline}>ومقدمي الخدمات في ألمانيا</Text>
        </View>

        <View style={styles.badgesRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>حرفيون</Text>
            <Text style={styles.badgeEmoji}>🔧</Text>
          </View>
          <View style={[styles.badge, styles.badgeAccent]}>
            <Text style={[styles.badgeText, styles.badgeTextAccent]}>ألمانيا</Text>
            <Text style={styles.badgeEmoji}>🇩🇪</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>موثوق</Text>
            <Text style={styles.badgeEmoji}>⭐</Text>
          </View>
        </View>
      </Animated.View>

      <View style={styles.bottomCard}>
        <Text style={styles.bottomTitle}>ابدأ رحلتك معنا</Text>
        <Text style={styles.bottomSubtitle}>
          انضم إلى آلاف المستخدمين الذين يثقون بـ ArabWerk
        </Text>

        <Animated.View
          style={{
            opacity: card1Anim,
            transform: [
              {
                translateY: card1Anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          }}
        >
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
            onPress={() => router.push('/(auth)/signup')}
          >
            <View style={styles.buttonArrow}>
              <Text style={styles.buttonArrowText}>→</Text>
            </View>
            <Text style={styles.primaryButtonText}>إنشاء حساب جديد</Text>
          </Pressable>
        </Animated.View>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>أو</Text>
          <View style={styles.dividerLine} />
        </View>

        <Animated.View
          style={{
            opacity: card2Anim,
            transform: [
              {
                translateY: card2Anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          }}
        >
          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.secondaryButtonText}>تسجيل الدخول</Text>
          </Pressable>
        </Animated.View>

        <Text style={styles.termsText}>
          بالمتابعة، أنت توافق على{' '}
          <Text style={styles.termsLink} onPress={() => setLegalModal('terms')}>
            شروط الاستخدام
          </Text>{' '}
          و{' '}
          <Text style={styles.termsLink} onPress={() => setLegalModal('privacy')}>
            سياسة الخصوصية
          </Text>
        </Text>
      </View>

      <LegalModal
        visible={legalModal !== null}
        type={legalModal}
        language={language}
        onChangeLanguage={setLanguage}
        onClose={() => setLegalModal(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF5FF',
  },

  bgBlob1: {
    position: 'absolute',
    width: wp(90),
    height: wp(90),
    borderRadius: wp(45),
    backgroundColor: '#2F6FDB',
    top: -wp(30),
    left: -wp(20),
    opacity: 0.08,
  },
  bgBlob2: {
    position: 'absolute',
    width: wp(60),
    height: wp(60),
    borderRadius: wp(30),
    backgroundColor: '#2F6FDB',
    top: hp(20),
    right: -wp(20),
    opacity: 0.06,
  },
  bgBlob3: {
    position: 'absolute',
    width: wp(50),
    height: wp(50),
    borderRadius: wp(25),
    backgroundColor: '#F4C430',
    top: hp(28),
    left: -wp(10),
    opacity: 0.12,
  },

  heroSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: hp(6),
    paddingHorizontal: wp(6),
  },
  logoRing: {
    width: wp(34),
    height: wp(34),
    borderRadius: wp(17),
    borderWidth: 2,
    borderColor: 'rgba(47, 111, 219, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(2),
    backgroundColor: 'rgba(47, 111, 219, 0.04)',
  },
  logoInner: {
    width: wp(27),
    height: wp(27),
    borderRadius: wp(13.5),
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2F6FDB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  logoImage: {
    width: '80%',
    height: '80%',
  },
  brandName: {
    fontSize: wp(11),
    fontWeight: '900',
    color: '#1F2937',
    letterSpacing: 0.5,
    marginBottom: hp(1.5),
  },
  taglineContainer: {
    alignItems: 'center',
    marginBottom: hp(3),
  },
  tagline: {
    fontSize: wp(4.2),
    color: '#374151',
    textAlign: 'center',
    lineHeight: hp(3.2),
    fontWeight: '500',
  },
  badgesRow: {
    flexDirection: 'row',
    gap: wp(2.5),
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    backgroundColor: '#FFFFFF',
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(0.8),
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  badgeAccent: {
    backgroundColor: '#EEF5FF',
    borderColor: '#BFDBFE',
  },
  badgeEmoji: { fontSize: wp(3.5) },
  badgeText: {
    fontSize: wp(3.2),
    color: '#374151',
    fontWeight: '600',
  },
  badgeTextAccent: {
    color: '#2F6FDB',
  },

  bottomCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: wp(6),
    paddingTop: hp(3),
    paddingBottom: hp(5),
    shadowColor: '#2F6FDB',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 20,
  },
  bottomTitle: {
    fontSize: wp(6),
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'right',
    marginBottom: hp(0.8),
  },
  bottomSubtitle: {
    fontSize: wp(3.5),
    color: '#6B7280',
    textAlign: 'right',
    marginBottom: hp(3),
    lineHeight: hp(2.8),
  },

  primaryButton: {
    backgroundColor: '#2F6FDB',
    borderRadius: 16,
    paddingVertical: hp(2),
    paddingHorizontal: wp(6),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(3),
    shadowColor: '#2F6FDB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonText: {
    fontSize: wp(4.5),
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buttonArrow: {
    width: wp(7),
    height: wp(7),
    borderRadius: wp(3.5),
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonArrowText: {
    fontSize: wp(4),
    color: '#FFFFFF',
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    paddingVertical: hp(2),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  secondaryButtonText: {
    fontSize: wp(4.5),
    fontWeight: '700',
    color: '#1F2937',
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
    marginVertical: hp(1.8),
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    fontSize: wp(3.8),
    color: '#9CA3AF',
    fontWeight: '500',
  },

  termsText: {
    fontSize: wp(3),
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: hp(2),
    lineHeight: hp(2.5),
  },
  termsLink: {
    color: '#2F6FDB',
    fontWeight: '600',
  },

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
  introCard: {
    backgroundColor: '#2F6FDB',
    borderRadius: 16,
    padding: wp(5),
    alignItems: 'center',
    marginBottom: hp(2.5),
  },
  introIcon: {
    fontSize: wp(10),
    marginBottom: hp(1),
  },
  introTitle: {
    fontSize: wp(5),
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: hp(0.8),
  },
  introSubtitle: {
    fontSize: wp(3.5),
    color: 'rgba(255,255,255,0.88)',
    textAlign: 'center',
    lineHeight: wp(5.5),
  },

  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: wp(4),
    marginBottom: hp(1.8),
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitleRow: {
    alignItems: 'center',
    marginBottom: hp(1.3),
    gap: wp(2),
  },
  sectionNumberBadge: {
    width: wp(7),
    height: wp(7),
    borderRadius: wp(3.5),
    backgroundColor: '#EEF5FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionNumberText: {
    fontSize: wp(3.4),
    fontWeight: '700',
    color: '#2F6FDB',
  },
  sectionTitle: {
    flex: 1,
    fontSize: wp(4.1),
    fontWeight: '700',
    color: '#1F2937',
  },
  sectionContent: {
    fontSize: wp(3.5),
    color: '#4B5563',
    lineHeight: wp(5.8),
  },
});
