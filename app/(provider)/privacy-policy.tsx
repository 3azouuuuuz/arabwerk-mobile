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
    pageTitle: 'سياسة الخصوصية',
    introTitle: 'سياسة الخصوصية',
    introSubtitle:
      'نلتزم بحماية بياناتك الشخصية وفق أعلى معايير الخصوصية المعمول بها في الاتحاد الأوروبي',
    footerNote: '© ArabWerk — جميع الحقوق محفوظة',
    languageLabel: 'اللغة',
    arabic: 'العربية',
    german: 'Deutsch',
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
          'البيانات تُعالج وفق أحد الأسس القانونية التالية:\n• تنفيذ العقد (مثل التوافق مع حساب المستخدم).\n• مصلحة مشروعة (مثل الأمان وتحسين المنصة).\n• موافقة المستخدم (خصوصًا لملفات تعريف الارتباط غير الأساسية).',
      },
      {
        title: 'الأطراف المتلقية للبيانات',
        content:
          'قد نشارك البيانات مع مزودي خدمات مثل استضافة الموقع، أدوات التحليل، وإرسال البريد الإلكتروني، ضمن التزام بالحفاظ على السرية والامتثال للتشريعات.',
      },
      {
        title: 'مدة الاحتفاظ بالبيانات',
        content:
          'نحتفظ بالبيانات فقط للمدة اللازمة لتحقيق الغرض منها، مثل: حذف بيانات النشاط بعد 12 شهرًا من عدم الاستخدام، أو حسب المتطلبات القانونية.',
      },
      {
        title: 'حقوق الأشخاص المعنيين',
        content:
          'للمستخدمين الحق في:\n• الوصول إلى بياناتهم وتعديلها أو حذفها ("حق النسيان").\n• تقييد المعالجة أو الاعتراض عليها.\n• سحب الموافقة في أي وقت.\n• نقل البيانات (Portability).\n• تقديم شكوى للسلطة المعنية.',
      },
      {
        title: 'ملفات تعريف الارتباط (Cookies)',
        content:
          'تُستخدم بعض ملفات الكوكيز الأساسية بشكل تلقائي، أما غير الأساسية مثل التحليل أو الإعلانات فهي تحتاج إلى موافقة واضحة ومسبقة من المستخدم وفق TDDDG وGDPR.',
      },
      {
        title: 'نقل البيانات دوليًا',
        content:
          'في حال نقل البيانات خارج الاتحاد الأوروبي، نضمن اتخاذ تدابير مناسبة مثل اتفاقيات نمطية (Standard Contractual Clauses) لحماية البيانات.',
      },
      {
        title: 'أمن البيانات والإجراءات التقنية',
        content:
          'نعتمد إجراءات تقنية وتنظيمية مناسبة مثل التشفير والتحكم بالوصول والنسخ الاحتياطية لحماية البيانات من الضياع أو الاختراق.',
      },
      {
        title: 'التعديلات على سياسة الخصوصية',
        content:
          'نحتفظ بالحق في تعديل هذه السياسة. عند وجود تغييرات جوهرية، سنخطرك عبر البريد الإلكتروني أو تنبيه ضمن المنصة، ونوفر خيار الاعتراض أو إنهاء الاستخدام.',
      },
    ],
  },
  de: {
    pageTitle: 'Datenschutzerklaerung',
    introTitle: 'Datenschutzerklaerung',
    introSubtitle:
      'Wir verpflichten uns, Ihre personenbezogenen Daten gemaess den hoechsten in der Europaeischen Union geltenden Datenschutzstandards zu schuetzen.',
    footerNote: '© ArabWerk — Alle Rechte vorbehalten',
    languageLabel: 'Sprache',
    arabic: 'العربية',
    german: 'Deutsch',
    sections: [
      {
        title: 'Rechtsgrundlage der Verarbeitung und Transparenz',
        content:
          'Die Datenverarbeitung bei ArabWerk unterliegt den Grundsaetzen der DSGVO, des BDSG und des TDDDG, einschliesslich Rechtmaessigkeit, Fairness und Transparenz, Zweckbindung, Datenminimierung, Richtigkeit, Speicherbegrenzung, Integritaet und Vertraulichkeit sowie Rechenschaftspflicht.',
      },
      {
        title: 'Arten der erhobenen Daten',
        content:
          '• Registrierungsdaten: z. B. Name, E-Mail-Adresse usw.\n• Nutzungsdaten: z. B. Besuchsprotokolle, IP-Adresse, Uhrzeit, aufgerufene Seiten usw.\n• Cookies und Tracking-Daten je nach Funktion.',
      },
      {
        title: 'Zwecke der Verarbeitung und Rechtsgrundlage',
        content:
          'Die Daten werden auf Grundlage einer der folgenden Rechtsgrundlagen verarbeitet:\n• Vertragserfuellung (z. B. zur Bereitstellung des Nutzerkontos).\n• Berechtigtes Interesse (z. B. Sicherheit und Verbesserung der Plattform).\n• Einwilligung des Nutzers (insbesondere fuer nicht notwendige Cookies).',
      },
      {
        title: 'Empfaenger der Daten',
        content:
          'Wir koennen Daten mit Dienstleistern wie Hosting-Anbietern, Analysetools und E-Mail-Diensten teilen, unter Wahrung der Vertraulichkeit und in Uebereinstimmung mit den geltenden Vorschriften.',
      },
      {
        title: 'Speicherdauer der Daten',
        content:
          'Wir speichern Daten nur so lange, wie es fuer den jeweiligen Zweck erforderlich ist, z. B. Loeschung von Aktivitaetsdaten nach 12 Monaten Inaktivitaet oder gemaess gesetzlicher Vorgaben.',
      },
      {
        title: 'Rechte der betroffenen Personen',
        content:
          'Nutzer haben das Recht auf:\n• Auskunft, Berichtigung oder Loeschung ihrer Daten ("Recht auf Vergessenwerden").\n• Einschraenkung der Verarbeitung oder Widerspruch dagegen.\n• Widerruf einer Einwilligung jederzeit.\n• Datenuebertragbarkeit.\n• Beschwerde bei der zustaendigen Aufsichtsbehoerde.',
      },
      {
        title: 'Cookies',
        content:
          'Einige technisch notwendige Cookies werden automatisch verwendet. Nicht notwendige Cookies, etwa fuer Analyse oder Werbung, erfordern jedoch eine klare vorherige Einwilligung des Nutzers gemaess TDDDG und DSGVO.',
      },
      {
        title: 'Internationale Datenuebermittlung',
        content:
          'Falls Daten ausserhalb der Europaeischen Union uebermittelt werden, stellen wir geeignete Schutzmassnahmen sicher, etwa Standardvertragsklauseln.',
      },
      {
        title: 'Datensicherheit und technische Massnahmen',
        content:
          'Wir setzen angemessene technische und organisatorische Massnahmen wie Verschluesselung, Zugriffskontrollen und Backups ein, um Daten vor Verlust oder unbefugtem Zugriff zu schuetzen.',
      },
      {
        title: 'Aenderungen der Datenschutzerklaerung',
        content:
          'Wir behalten uns das Recht vor, diese Richtlinie zu aendern. Bei wesentlichen Aenderungen informieren wir Sie per E-Mail oder ueber einen Hinweis in der Plattform und geben Ihnen die Moeglichkeit zum Widerspruch oder zur Beendigung der Nutzung.',
      },
    ],
  },
};

export default function PrivacyPolicyScreen() {
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
          <Text style={styles.introIcon}>🔐</Text>
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

  sectionContent: {
    fontSize: wp(3.6),
    color: '#4B5563',
    lineHeight: wp(6),
  },

  footerNote: {
    fontSize: wp(3.2),
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: hp(2),
  },
});
