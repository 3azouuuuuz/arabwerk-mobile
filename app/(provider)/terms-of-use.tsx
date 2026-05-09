import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { hp, wp } from '../../helpers/common';

type Language = 'ar' | 'de';

const content = {
  ar: {
    pageTitle: 'شروط الاستخدام',
    introTitle: 'الشروط والأحكام العامة (AGB)',
    introSubtitle: 'يُرجى قراءة هذه الشروط بعناية قبل استخدام منصة ArabWerk',
    footerNote: '© ArabWerk — جميع الحقوق محفوظة',
    languageLabel: 'اللغة',
    arabic: 'العربية',
    german: 'Deutsch',
    sections: [
      {
        title: 'التعاريف العامة',
        content: [
          '• المنصة: ArabWerk، وسيط إلكتروني يربط العملاء بمقدمي الخدمات والحرفيين في ألمانيا. لا تعد المنصة طرفًا في العقود المبرمة بين الأطراف.',
          '• العميل: كل شخص طبيعي أو اعتباري يستخدم المنصة لطلب خدمات مشروعة.',
          '• مقدم الخدمة: كل شخص طبيعي أو اعتباري (حرفي أو مزود خدمات) يقدم خدماته عبر المنصة ملتزمًا بالقوانين الألمانية.',
          '• المستخدم: أي شخص مسجل في المنصة، سواء كان عميلًا أو مقدم خدمة.',
        ],
      },
      {
        title: 'التسجيل والاستخدام',
        content: [
          '• التسجيل متاح فقط للبالغين القادرين على التعاقد قانونيًا.',
          '• يلتزم المستخدم بإدخال بيانات صحيحة وتحديثها باستمرار. الحساب شخصي غير قابل للنقل.',
          '• يحق للمنصة تعليق أو إلغاء أي حساب مخالف للشروط.',
        ],
      },
      {
        title: 'الاشتراكات',
        content: [
          'حساب العميل (طالب الخدمة) مجاني دائماً. أما الحرفيين ومقدمي الخدمات فلديهم خيارين:',
          '• الاشتراك المجاني (Free): يسمح بإنشاء ملف تعريفي أساسي دون تقديم عروض مباشرة وأي ميزات أخرى غير الادراج في الدليل.',
          '• الاشتراك المدفوع (Pro): يمنح مزايا مثل التواصل المباشر مع العملاء وتقديم العروض. الرسوم تُدفع مقدمًا (شهريًا) وتجدد تلقائيًا كل شهر حتى يقوم المستخدم بإلغاء الخطة.',
          '\nسياسة الإلغاء والاسترداد:',
          '• يقر المستخدم (مقدم الخدمة) أن رسوم الاشتراكات المدفوعة غير قابلة للاسترداد تحت أي ظرف.',
          '• بموافقته على الاشتراك المدفوع، يطلب المستخدم بدء الخدمة فورًا ويتنازل صراحةً عن حقه القانوني في التراجع أو استرداد المبلغ وفقًا للمادة §356 فقرة 5 من القانون المدني الألماني (BGB).',
          '• يظل الاشتراك فعالًا حتى نهاية الفترة المدفوعة حتى إذا لم يستخدم مقدم الخدمة المنصة.',
        ],
      },
      {
        title: 'التقييمات',
        content: [
          '• يحق للعملاء تقييم مقدمي الخدمات بعد تنفيذ المشاريع.',
          '• يجب أن تكون التقييمات صادقة وخالية من الإساءة.',
          '• يحق للمنصة حذف أو تعديل التقييمات المخالفة.',
        ],
      },
      {
        title: 'المراسلات الداخلية',
        content: [
          '• الرسائل داخل المنصة مخصصة حصريًا لمناقشة تفاصيل المشاريع.',
          '• يُمنع استخدامها للإعلانات أو إرسال رسائل غير لائقة أو مسيئة.',
          '• المنصة غير مسؤولة عن أي تواصل يتم خارج نظامها الداخلي.',
        ],
      },
      {
        title: 'حدود المسؤولية',
        content: [
          '• المنصة ليست طرفًا في العقود ولا تتحمل أي مسؤولية عن جودة أو تنفيذ الخدمات.',
          '• الأعطال التقنية الخارجة عن إرادة المنصة لا تُرتب أي التزام.',
          '• يتحمل مقدمو الخدمات المسؤولية القانونية الكاملة عن الأنشطة والخدمات التي يقدمونها عبر المنصة.',
          '• يقر مقدم الخدمة بأنه يمتلك جميع التراخيص والأذونات والتسجيلات القانونية اللازمة، وأنه يلتزم بكافة القوانين واللوائح المعمول بها في ألمانيا.',
          '• تحتفظ المنصة بالحق في طلب وثائق إثبات أو مستندات رسمية، ولها الحق في تعليق أو إلغاء الحساب في حال عدم الامتثال.',
        ],
      },
      {
        title: 'الملكية الفكرية',
        content: [
          '• جميع حقوق التصميم والمحتوى والبرمجيات تخص ArabWerk.',
          '• يُمنح المستخدم ترخيصًا محدودًا للاستعمال المشروع فقط ضمن إطار المنصة.',
          '• يتحمل المستخدم وحده المسؤولية الكاملة عن جميع الصور أو الوسائط التي يقوم برفعها أو نشرها.',
          '• يضمن المستخدم أنه يمتلك الحقوق اللازمة لهذه المواد، وأنها لا تنتهك حقوق الملكية الفكرية أو أي حقوق أخرى للغير.',
        ],
      },
      {
        title: 'إنهاء الحساب',
        content: [
          '• يحق للمستخدم حذف حسابه في أي وقت.',
          '• تحتفظ المنصة بحق تعليق أو إلغاء الحساب في حال المخالفات الجسيمة.',
        ],
      },
      {
        title: 'القانون الواجب التطبيق',
        content: [
          '• تخضع هذه الشروط للقانون الألماني.',
          '• في حال وجود أي تعارض بين النسخة العربية والألمانية، يُعتمد النص الألماني.',
        ],
      },
    ],
  },
  de: {
    pageTitle: 'Nutzungsbedingungen',
    introTitle: 'Allgemeine Geschaeftsbedingungen (AGB)',
    introSubtitle: 'Bitte lesen Sie diese Bedingungen sorgfaeltig, bevor Sie die ArabWerk-Plattform nutzen.',
    footerNote: '© ArabWerk — Alle Rechte vorbehalten',
    languageLabel: 'Sprache',
    arabic: 'العربية',
    german: 'Deutsch',
    sections: [
      {
        title: 'Allgemeine Begriffsbestimmungen',
        content: [
          '• Plattform: ArabWerk, eine elektronische Vermittlungsplattform, die Kunden mit Dienstleistern und Handwerkern in Deutschland verbindet. Die Plattform ist keine Vertragspartei der zwischen den Parteien geschlossenen Vertraege.',
          '• Kunde: Jede natuerliche oder juristische Person, die die Plattform nutzt, um rechtmaessige Dienstleistungen anzufragen.',
          '• Dienstleister: Jede natuerliche oder juristische Person (Handwerker oder sonstiger Anbieter), die ihre Leistungen ueber die Plattform anbietet und dabei die deutschen Gesetze einhaelt.',
          '• Nutzer: Jede auf der Plattform registrierte Person, unabhaengig davon, ob sie Kunde oder Dienstleister ist.',
        ],
      },
      {
        title: 'Registrierung und Nutzung',
        content: [
          '• Die Registrierung ist nur volljaehrigen Personen gestattet, die rechtswirksam Vertraege abschliessen koennen.',
          '• Der Nutzer ist verpflichtet, zutreffende Daten anzugeben und diese laufend aktuell zu halten. Das Konto ist persoenlich und nicht uebertragbar.',
          '• Die Plattform ist berechtigt, jedes Konto zu sperren oder zu loeschen, das gegen diese Bedingungen verstoesst.',
        ],
      },
      {
        title: 'Abonnements',
        content: [
          'Das Konto fuer Kunden (Dienstleistungssuchende) ist stets kostenlos. Fuer Handwerker und Dienstleister gibt es hingegen zwei Optionen:',
          '• Kostenloses Abonnement (Free): Ermoeglicht ein einfaches Profil, jedoch keine direkte Angebotsabgabe und keine weiteren Funktionen ausser dem Eintrag im Verzeichnis.',
          '• Kostenpflichtiges Abonnement (Pro): Bietet Vorteile wie die direkte Kommunikation mit Kunden und die Abgabe von Angeboten. Die Gebuehren sind im Voraus (monatlich) zu zahlen und verlaengern sich automatisch jeden Monat, bis der Nutzer den Tarif kuendigt.',
          '\nKuendigungs- und Erstattungsrichtlinie:',
          '• Der Nutzer (Dienstleister) erkennt an, dass Gebuehren fuer kostenpflichtige Abonnements unter keinen Umstaenden erstattungsfaehig sind.',
          '• Mit der Zustimmung zum kostenpflichtigen Abonnement verlangt der Nutzer, dass die Leistung sofort beginnt, und verzichtet ausdruecklich auf sein gesetzliches Widerrufsrecht bzw. auf eine Rueckerstattung gemaess §356 Abs. 5 BGB.',
          '• Das Abonnement bleibt bis zum Ende des bezahlten Zeitraums aktiv, auch wenn der Dienstleister die Plattform nicht nutzt.',
        ],
      },
      {
        title: 'Bewertungen',
        content: [
          '• Kunden duerfen Dienstleister nach Abschluss von Projekten bewerten.',
          '• Bewertungen muessen wahrheitsgemaess und frei von Beleidigungen sein.',
          '• Die Plattform ist berechtigt, rechtswidrige oder unangemessene Bewertungen zu loeschen oder anzupassen.',
        ],
      },
      {
        title: 'Interne Kommunikation',
        content: [
          '• Nachrichten innerhalb der Plattform dienen ausschliesslich der Besprechung von Projektdetails.',
          '• Ihre Nutzung fuer Werbung oder fuer unangemessene bzw. beleidigende Inhalte ist untersagt.',
          '• Die Plattform ist nicht verantwortlich fuer Kommunikation, die ausserhalb des internen Systems stattfindet.',
        ],
      },
      {
        title: 'Haftungsbeschraenkung',
        content: [
          '• Die Plattform ist keine Vertragspartei und uebernimmt keine Verantwortung fuer die Qualitaet oder Ausfuehrung der Dienstleistungen.',
          '• Technische Stoerungen ausserhalb des Einflussbereichs der Plattform begruenden keine Verpflichtung.',
          '• Dienstleister tragen die volle rechtliche Verantwortung fuer die Taetigkeiten und Leistungen, die sie ueber die Plattform anbieten.',
          '• Der Dienstleister bestaetigt, dass er ueber alle erforderlichen Genehmigungen, Zulassungen und rechtlichen Registrierungen verfuegt und saemtliche in Deutschland geltenden Gesetze und Vorschriften einhaelt.',
          '• Die Plattform behaelt sich das Recht vor, Nachweise oder amtliche Unterlagen anzufordern und das Konto bei Nichteinhaltung zu sperren oder zu loeschen.',
        ],
      },
      {
        title: 'Geistiges Eigentum',
        content: [
          '• Saemtliche Rechte an Design, Inhalten und Software stehen ArabWerk zu.',
          '• Dem Nutzer wird ausschliesslich eine beschraenkte Lizenz zur rechtmaessigen Nutzung innerhalb der Plattform eingeraeumt.',
          '• Der Nutzer traegt die alleinige Verantwortung fuer alle Bilder oder Medien, die er hochlaedt oder veroeffentlicht.',
          '• Der Nutzer garantiert, dass er ueber die erforderlichen Rechte an diesen Materialien verfuegt und dass sie keine Rechte des geistigen Eigentums oder sonstige Rechte Dritter verletzen.',
        ],
      },
      {
        title: 'Beendigung des Kontos',
        content: [
          '• Der Nutzer kann sein Konto jederzeit loeschen.',
          '• Die Plattform behaelt sich das Recht vor, ein Konto bei schwerwiegenden Verstoessen zu sperren oder zu loeschen.',
        ],
      },
      {
        title: 'Anwendbares Recht',
        content: [
          '• Diese Bedingungen unterliegen deutschem Recht.',
          '• Im Falle eines Widerspruchs zwischen der arabischen und der deutschen Fassung ist die deutsche Fassung massgeblich.',
        ],
      },
    ],
  },
};

export default function TermsOfUseScreen() {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>('ar');

  const isArabic = language === 'ar';
  const t = content[language];

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      router.back();
      return true;
    });
    return () => backHandler.remove();
  }, [router]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <View style={[styles.header, { flexDirection: isArabic ? 'row' : 'row-reverse' }]}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>{t.pageTitle}</Text>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          onPress={() => router.back()}
        >
          <Ionicons
            name={isArabic ? 'chevron-forward' : 'chevron-back'}
            size={wp(6)}
            color="#1F2937"
          />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.languageCard}>
          <Text
            style={[
              styles.languageLabel,
              {
                textAlign: isArabic ? 'right' : 'left',
                writingDirection: isArabic ? 'rtl' : 'ltr',
              },
            ]}
          >
            {t.languageLabel}
          </Text>

          <View style={[styles.languageSwitch, { flexDirection: isArabic ? 'row-reverse' : 'row' }]}>
            <Pressable
              onPress={() => setLanguage('ar')}
              style={[styles.langBtn, language === 'ar' && styles.langBtnActive]}
            >
              <Text style={[styles.langBtnText, language === 'ar' && styles.langBtnTextActive]}>
                {content.ar.arabic}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setLanguage('de')}
              style={[styles.langBtn, language === 'de' && styles.langBtnActive]}
            >
              <Text style={[styles.langBtnText, language === 'de' && styles.langBtnTextActive]}>
                {content.de.german}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.introCard}>
          <Text style={styles.introIcon}>📄</Text>
          <Text
            style={[
              styles.introTitle,
              {
                textAlign: 'center',
                writingDirection: isArabic ? 'rtl' : 'ltr',
              },
            ]}
          >
            {t.introTitle}
          </Text>
          <Text
            style={[
              styles.introSubtitle,
              {
                textAlign: 'center',
                writingDirection: isArabic ? 'rtl' : 'ltr',
              },
            ]}
          >
            {t.introSubtitle}
          </Text>
        </View>

        {t.sections.map((section, index) => (
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

            {section.content.map((line, li) => (
              <Text
                key={li}
                style={[
                  styles.sectionLine,
                  line.startsWith('\n') && styles.sectionLineSpaced,
                  {
                    textAlign: isArabic ? 'right' : 'left',
                    writingDirection: isArabic ? 'rtl' : 'ltr',
                  },
                ]}
              >
                {line.replace(/^\n/, '')}
              </Text>
            ))}
          </View>
        ))}

        <Text
          style={[
            styles.footerNote,
            { writingDirection: isArabic ? 'rtl' : 'ltr' },
          ]}
        >
          {t.footerNote}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },

  header: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingTop: hp(6),
    paddingBottom: hp(2),
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

  headerSpacer: {
    width: wp(10),
  },

  backBtn: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(5),
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerTitle: {
    fontSize: wp(5),
    fontWeight: '700',
    color: '#1F2937',
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    padding: wp(4),
    paddingBottom: hp(8),
  },

  languageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: wp(4),
    marginBottom: hp(2),
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  languageLabel: {
    fontSize: wp(3.8),
    fontWeight: '700',
    color: '#374151',
    marginBottom: hp(1.5),
  },

  languageSwitch: {
    gap: wp(3),
  },

  langBtn: {
    flex: 1,
    paddingVertical: hp(1.4),
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },

  langBtnActive: {
    backgroundColor: '#2F6FDB',
  },

  langBtnText: {
    fontSize: wp(3.8),
    fontWeight: '700',
    color: '#374151',
  },

  langBtnTextActive: {
    color: '#FFFFFF',
  },

  introCard: {
    backgroundColor: '#2F6FDB',
    borderRadius: 16,
    padding: wp(5),
    alignItems: 'center',
    marginBottom: hp(3),
  },

  introIcon: {
    fontSize: wp(10),
    marginBottom: hp(1),
  },

  introTitle: {
    fontSize: wp(5),
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: hp(0.8),
  },

  introSubtitle: {
    fontSize: wp(3.5),
    color: 'rgba(255,255,255,0.85)',
    lineHeight: wp(5.5),
  },

  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: wp(4),
    marginBottom: hp(2),
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },

  sectionTitleRow: {
    alignItems: 'center',
    marginBottom: hp(1.5),
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
    fontSize: wp(3.5),
    fontWeight: '700',
    color: '#2F6FDB',
  },

  sectionTitle: {
    fontSize: wp(4.2),
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
  },

  sectionLine: {
    fontSize: wp(3.6),
    color: '#4B5563',
    lineHeight: wp(6),
    marginBottom: hp(0.5),
  },

  sectionLineSpaced: {
    marginTop: hp(1),
  },

  footerNote: {
    fontSize: wp(3.2),
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: hp(2),
  },
});
