// Qoliplar — darsda o'tilgan gap tuzish qoliplari. Har birida: qoida (formula), misollar, mashq.
// Yangi mavzu qo'shish: shu ro'yxat oxiriga yangi obyekt qo'shiladi.
window.PATTERNS = [
{
  id: "hy", unit: 1, title: "I am learn ✗ — harakatmi yoki holat?",
  lead: "Eng ko'p uchraydigan xato: harakat so'zi oldiga am/is/are qo'yish. Tekshirish: o'zbekcha so'zga -moq qo'shib bo'lsa (ishla-moq, o'rgan-moq), demak harakat, am/is/are qo'yilmaydi. Bo'lmasa (charchagan, shifokor), demak holat, am/is/are kerak.",
  rules: [
    ["I learn English. ✓", "harakat → am yo'q"],
    ["I am learn English. ✗", "am + harakat: ikkita fe'l, bittasi ortiqcha"],
    ["I am tired. ✓", "holat → am kerak"],
    ["I tired. ✗", "holatda am tushib qolmaydi"],
    ["My uncle works in Samarkand.", "u + harakat → -s qo'shiladi, is yo'q"]
  ],
  examples: [["I work every day.", "Har kuni ishlayman."], ["I am a teacher.", "Men o'qituvchiman."], ["She lives in Dubai.", "U Dubayda yashaydi."]],
  drill: [
    {q:"Men ingliz tili o'rganaman.", o:["I am learn English.","I learn English.","I learning English."], a:1, why:"o'rgan-moq harakat, shuning uchun am kerak emas."},
    {q:"Men charchadim.", o:["I tired.","I am tired.","I do tired."], a:1, why:"charchagan holat (-moq yo'q), shuning uchun am kerak."},
    {q:"Amakim Samarqandda ishlaydi.", o:["My uncle is work in Samarkand.","My uncle work in Samarkand.","My uncle works in Samarkand."], a:2, why:"ishla-moq harakat: is yo'q. U (he) bo'lgani uchun -s qo'shiladi."},
    {q:"Sen shifokormisan?", o:["Do you a doctor?","Are you a doctor?","Are you doctor?"], a:1, why:"shifokor holat (kim?), shuning uchun savolda Are."},
    {q:"Choy ichasanmi?", o:["Are you drink tea?","Do you drink tea?","Do you drinks tea?"], a:1, why:"ich-moq harakat, shuning uchun savolda Do. -s qo'shilmaydi."},
    {q:"Ular do'stlar.", o:["They are friends.","They friends.","They do friends."], a:0, why:"do'st holat, shuning uchun are kerak."},
    {q:"Men Toshkentda yashayman.", o:["I am live in Tashkent.","I live in Tashkent.","I living in Tashkent."], a:1, why:"yasha-moq harakat, shuning uchun am kerak emas."},
    {q:"Ko'cha issiq.", o:["It hot.","It is hot.","It does hot."], a:1, why:"issiq holat, shuning uchun is kerak."}
  ]
},
{
  id: "be", unit: 1, title: "am / is / are",
  lead: "O'zbekchada \"-man, -san, -dir\" qo'shimchasi bor. Inglizchada uning o'rnida alohida so'z turadi.",
  rules: [
    ["I am  (I'm)", "Men ...man"],
    ["You / We / They are  (you're)", "Sen/siz, biz, ular ..."],
    ["He / She / It is  (he's)", "U ..."],
    ["Inkor: I'm not · He isn't · They aren't", "...emas"],
    ["Savol: Are you ...?  Is he ...?", "...mi?  — so'z joyi almashadi"]
  ],
  examples: [["I'm a nurse.", "Men hamshiraman."], ["She's from Samarkand.", "U Samarqanddan."], ["Are you tired?", "Charchadingizmi?"]],
  drill: [
    {q:"I ___ from Tashkent.", o:["am","is","are"], a:0, why:"I bilan doim am."},
    {q:"My brother ___ a doctor.", o:["am","is","are"], a:1, why:"Bitta odam (u) — is."},
    {q:"They ___ very friendly.", o:["is","are","am"], a:1, why:"Ular — are."},
    {q:"___ you busy today?", o:["Do","Are","Is"], a:1, why:"busy — holat (\"bandman\"), harakat emas. Holatda Are/Is."},
    {q:"He ___ tired. (emas)", o:["isn't","doesn't","aren't"], a:0, why:"tired — holat, shuning uchun is + not."},
    {q:"It ___ cold today.", o:["is","are","do"], a:0, why:"It — is."}
  ]
},
{
  id: "ps-s", unit: 4, title: "U ... qiladi: -s qo'shiladi",
  lead: "He / She / It (u) bo'lsa, harakat so'ziga -s qo'shiladi. Men, sen, biz, ular uchun -s yo'q.",
  rules: [
    ["I / You / We / They work", "Ishlayman, ishlaysan, ishlaymiz, ishlaydi(lar)"],
    ["He / She / It works", "U ishlaydi  ← -s!"],
    ["go → goes · watch → watches · study → studies", "-o, -ch, -sh bo'lsa -es; -y bo'lsa -ies"],
    ["have → has", "U uchun has"]
  ],
  examples: [["She wears a black jacket.", "U qora kurtka kiyadi."], ["My father goes to work by metro.", "Otam ishga metroda boradi."]],
  drill: [
    {q:"She ___ tea every morning.", o:["drink","drinks","drinking"], a:1, why:"She (u) — -s qo'shiladi: drinks."},
    {q:"I ___ in Tashkent.", o:["live","lives","living"], a:0, why:"I bilan -s yo'q."},
    {q:"My friend ___ jeans every day.", o:["wear","wears","wearing"], a:1, why:"My friend = u (he) → wears."},
    {q:"He ___ to work at 8.", o:["go","gos","goes"], a:2, why:"go → goes (-es)."},
    {q:"Akmal ___ two children.", o:["have","has","haves"], a:1, why:"U uchun have emas, has."},
    {q:"They ___ football at the weekend.", o:["play","plays","playes"], a:0, why:"They — -s yo'q."}
  ]
},
{
  id: "neg", unit: 4, title: "Qilmayman: don't / doesn't",
  lead: "O'zbekchada \"-ma\" qo'shamiz. Inglizchada harakat so'zidan oldin don't yoki doesn't qo'yiladi.",
  rules: [
    ["I / You / We / They + don't + so'z", "I don't drink coffee."],
    ["He / She / It + doesn't + so'z", "She doesn't drink coffee.  ← -s yo'qoladi!"],
    ["Holat bo'lsa: I'm not / He isn't", "I'm not tired. (do emas)"]
  ],
  examples: [["I don't work on Sunday.", "Yakshanba ishlamayman."], ["He doesn't like fish.", "U baliqni yoqtirmaydi."]],
  drill: [
    {q:"I ___ eat meat.", o:["don't","doesn't","not"], a:0, why:"I — don't."},
    {q:"She ___ work at the weekend.", o:["don't","doesn't","isn't"], a:1, why:"She — doesn't."},
    {q:"He doesn't ___ TV.", o:["watches","watch","watching"], a:1, why:"doesn't dan keyin -s qo'yilmaydi."},
    {q:"We ___ live in Samarkand.", o:["doesn't","don't","aren't"], a:1, why:"We — don't."},
    {q:"My mother ___ tired.", o:["doesn't","isn't","don't"], a:1, why:"tired — holat: isn't."}
  ]
},
{
  id: "q", unit: 4, title: "Savol: Do / Does ...?",
  lead: "O'zbekchada oxiriga \"-mi\" qo'shamiz. Inglizchada gap boshiga Do yoki Does qo'yiladi. \"-moq\" testi: so'zga -moq qo'shib bo'lsa (ishlamoq, ichmoq) — Do/Does. Holat bo'lsa (charchagan, band) — Are/Is.",
  rules: [
    ["Do + I/you/we/they + so'z ...?", "Do you work here?"],
    ["Does + he/she/it + so'z ...?", "Does she work here?  ← -s yo'qoladi"],
    ["Qisqa javob: Yes, I do. / No, I don't.", "Yes, she does. / No, she doesn't."],
    ["Holat: Are you ...? / Is he ...?", "Are you tired? — Yes, I am."]
  ],
  examples: [["Do you like plov?", "Oshni yaxshi ko'rasizmi?"], ["Does your brother live in Tashkent?", "Akangiz Toshkentda yashaydimi?"]],
  drill: [
    {q:"___ you drink coffee?", o:["Do","Does","Are"], a:0, why:"you — Do. drink — harakat (ichmoq)."},
    {q:"___ your brother live in Tashkent?", o:["Do","Does","Is"], a:1, why:"your brother = u → Does."},
    {q:"___ she tired?", o:["Does","Is","Do"], a:1, why:"tired — holat, -moq qo'shilmaydi → Is."},
    {q:"Does he ___ in a bank?", o:["works","work","working"], a:1, why:"Does bor bo'lsa, so'zga -s qo'shilmaydi."},
    {q:"Do you like football? — Yes, I ___.", o:["do","am","like"], a:0, why:"Do bilan so'radi → Yes, I do."},
    {q:"Does she drive? — No, she ___.", o:["don't","isn't","doesn't"], a:2, why:"Does → doesn't."},
    {q:"Have you got a car? — Yes, I ___.", o:["do","have","am"], a:1, why:"Have bilan so'radi → Yes, I have."}
  ]
},
{
  id: "freq", unit: 4, title: "Qancha tez-tez: always … never",
  lead: "Bu so'zlar harakat so'zidan OLDIN turadi, lekin am/is/are dan KEYIN.",
  rules: [
    ["always 100% · usually 85% · often 75% · sometimes 40% · never 0%", "doim · odatda · tez-tez · ba'zan · hech qachon"],
    ["I always drink tea.", "harakatdan oldin"],
    ["She is always late.", "is dan keyin  (always is emas!)"],
    ["How often ...? — Every day / at the weekend", "Qancha tez-tez?"]
  ],
  examples: [["I usually get up at 7.", "Odatda 7 da turaman."], ["He's never busy.", "U hech qachon band emas."]],
  drill: [
    {q:"Qaysi to'g'ri?", o:["I drink always tea.","I always drink tea.","Always I drink tea."], a:1, why:"always — harakat so'zidan (drink) oldin."},
    {q:"Qaysi to'g'ri?", o:["She always is late.","She is always late.","She late always is."], a:1, why:"is dan keyin: is always."},
    {q:"I ___ eat fish. (0% — hech qachon)", o:["always","never","often"], a:1, why:"0% — never."},
    {q:"We ___ go to Samarkand. (40% — ba'zan)", o:["sometimes","usually","always"], a:0, why:"40% — sometimes."},
    {q:"Qaysi to'g'ri?", o:["They are usually busy.","They usually are busy.","They busy usually are."], a:0, why:"are dan keyin: are usually."}
  ]
},
{
  id: "have", unit: 3, title: "have got / has got",
  lead: "\"Menda ... bor\" deyish uchun. U (he/she) bo'lsa has got.",
  rules: [
    ["I / You / We / They have got  (I've got)", "Menda ... bor"],
    ["He / She / It has got  (he's got)", "Unda ... bor"],
    ["Inkor: I haven't got · She hasn't got", "... yo'q"],
    ["Savol: Have you got ...? — Yes, I have. / No, I haven't.", "Has he got ...? — Yes, he has."]
  ],
  examples: [["I've got a car.", "Mashinam bor."], ["She hasn't got a phone.", "Uning telefoni yo'q."]],
  drill: [
    {q:"I ___ got a laptop.", o:["have","has","am"], a:0, why:"I — have got."},
    {q:"My sister ___ got long hair.", o:["have","has","is"], a:1, why:"U — has got."},
    {q:"___ you got a car?", o:["Do","Have","Are"], a:1, why:"have got savolida Have boshida."},
    {q:"Has he got a jacket? — No, he ___.", o:["hasn't","doesn't","isn't"], a:0, why:"Has → hasn't."},
    {q:"They ___ got children.", o:["hasn't","haven't","don't"], a:1, why:"They — haven't got."}
  ]
},
{
  id: "and", unit: 5, title: "and / but / because",
  lead: "Ikki gapni bog'lash: and = va, but = lekin, because = chunki. \"Why?\" savoliga because bilan javob beriladi.",
  rules: [
    ["I like tea and coffee.", "va — bir xil yo'nalish"],
    ["I like tea but I don't like coffee.", "lekin — qarama-qarshi"],
    ["I study English because it's useful.", "chunki — sabab"]
  ],
  examples: [["My favourite colour is black because it's smart.", "Sevimli rangim qora, chunki u ozoda ko'rinadi."]],
  drill: [
    {q:"I like jeans ___ T-shirts.", o:["and","but","because"], a:0, why:"Ikkalasi ham yoqadi — and."},
    {q:"He's tired ___ he works a lot.", o:["and","but","because"], a:2, why:"Charchaganining sababi — because."},
    {q:"I like Paris ___ it's very expensive.", o:["because","but","and"], a:1, why:"Yoqadi, lekin qimmat — but."},
    {q:"Why do you study English? — ___ it's important for my work.", o:["Because","But","And"], a:0, why:"Why? → Because."}
  ]
},
{
  id: "poss", unit: 2, title: "'s (egalik) · it's / they're",
  lead: "\"Akmalning o'g'li\" = Akmal's son. Ikki kishi bo'lsa, 's faqat oxirgisiga: Helena and Nico's son.",
  rules: [
    ["Akmal's car", "Akmalning mashinasi"],
    ["Helena and Nico's son", "Helena va Nikoning o'g'li  ('s bitta, oxirida)"],
    ["It's = it is (bitta narsa)", "It's red."],
    ["They're = they are (ko'p narsa)", "They're red."]
  ],
  examples: [["My friend's style is casual.", "Do'stimning uslubi erkin."], ["These shoes? They're new.", "Bu tuflimi? Ular yangi."]],
  drill: [
    {q:"This is ___ phone. (Jasurning)", o:["Jasur","Jasur's","Jasurs"], a:1, why:"egalik — 's."},
    {q:"Tony is Helena ___ Nico's son.", o:["and","'s and","but"], a:0, why:"'s faqat oxirgi ismda: Helena and Nico's."},
    {q:"Look at my bag. ___ new.", o:["It's","They're","Its are"], a:0, why:"bag — bitta → It's."},
    {q:"My shoes? ___ brown.", o:["It's","They're","There"], a:1, why:"shoes — ko'p → They're."}
  ]
},
{
  id: "wh", unit: 4, title: "Savol so'zlari: What · Where · When …",
  lead: "Savol so'zi + do/does + kim + harakat ...? — Where do you live?",
  rules: [
    ["What = nima · Where = qayerda · When = qachon", ""],
    ["Why = nega · Who = kim · How = qanday", ""],
    ["What time = soat nechada · How often = qancha tez-tez", ""],
    ["Where do you work?  ·  What time does she get up?", "does — u uchun"]
  ],
  examples: [["What time do you have lunch?", "Soat nechada tushlik qilasiz?"], ["Where does your sister live?", "Opangiz qayerda yashaydi?"]],
  drill: [
    {q:"___ do you live? — In Tashkent.", o:["What","Where","When"], a:1, why:"Joy so'raladi — Where."},
    {q:"___ time do you get up? — At 7.", o:["What","Where","Who"], a:0, why:"Soat — What time."},
    {q:"___ do you study English? — Because it's useful.", o:["Why","How","When"], a:0, why:"Sabab — Why."},
    {q:"Where ___ your brother work?", o:["do","does","is"], a:1, why:"your brother = u → does."},
    {q:"___ often do you go shopping?", o:["What","How","When"], a:1, why:"How often = qancha tez-tez."}
  ]
},
{
  id: "was", unit: 8, title: "was / were — edi",
  lead: "O'tgan zamonda holat: am/is → was, are → were. \"Kecha charchagan edim\" = I was tired yesterday.",
  rules: [
    ["I / He / She / It was", "...edi (bitta)"],
    ["You / We / They were", "...edingiz, edik, edilar"],
    ["Inkor: wasn't / weren't", "...emas edi"],
    ["Savol: Was he ...? / Were you ...?", "...midi?"]
  ],
  examples: [["I was tired yesterday.", "Kecha charchagan edim."], ["We were in Dubai last week.", "O'tgan hafta Dubayda edik."], ["Were you at work yesterday?", "Kecha ishda edingizmi?"]],
  drill: [
    {q:"I ___ tired yesterday.", o:["was","were","am"], a:0, why:"I bilan was."},
    {q:"They ___ at home last night.", o:["was","were","are"], a:1, why:"They bilan were."},
    {q:"___ you busy yesterday?", o:["Was","Were","Did"], a:1, why:"you bilan Were. busy holat, shuning uchun Did emas."},
    {q:"The meeting ___ long. (emas edi)", o:["wasn't","weren't","didn't"], a:0, why:"meeting = it, shuning uchun wasn't."},
    {q:"My parents ___ in Samarkand last week.", o:["was","were","is"], a:1, why:"parents ko'plik, shuning uchun were."}
  ]
},
{
  id: "past", unit: 8, title: "Kecha qildim: -ed",
  lead: "O'tgan zamonda harakat so'ziga -ed qo'shiladi. Hamma uchun bir xil: u (he/she) uchun ham -s yo'q.",
  rules: [
    ["work → worked · finish → finished", "harakatga -ed"],
    ["live → lived · study → studied · stop → stopped", "-e bo'lsa -d; -y bo'lsa -ied"],
    ["I / She / They worked", "hamma uchun bir xil"],
    ["Vaqt so'zi oxirida: yesterday, last week", "kecha, o'tgan hafta"],
    ["I was work ✗ → I worked ✓", "harakatda was kerak emas"]
  ],
  examples: [["I worked late yesterday.", "Kecha kech ishladim."], ["She finished her homework.", "U uy vazifasini tugatdi."]],
  drill: [
    {q:"I ___ yesterday.", o:["work","worked","working"], a:1, why:"Kecha (yesterday): -ed qo'shiladi."},
    {q:"She ___ English last year.", o:["studyed","studied","studies"], a:1, why:"-y bilan tugasa -ied: studied."},
    {q:"We ___ the project last week.", o:["finish","finishes","finished"], a:2, why:"O'tgan hafta: -ed qo'shiladi."},
    {q:"He ___ in Dubai in 2024.", o:["lived","lives","liveed"], a:0, why:"-e bilan tugasa faqat -d: lived."},
    {q:"Kecha ishladim.", o:["I was work yesterday.","I worked yesterday.","I am worked yesterday."], a:1, why:"Harakatda was yoki am kerak emas, faqat -ed qo'shiladi."}
  ]
},
{
  id: "irr", unit: 9, title: "Noto'g'ri fe'llar: go → went",
  lead: "Eng ko'p ishlatiladigan fe'llar -ed olmaydi. Ularning o'z shakli bor, uni yodlash kerak.",
  rules: [
    ["go → went", "bormoq"],
    ["do → did", "qilmoq"],
    ["make → made", "yasamoq"],
    ["send → sent", "yubormoq"],
    ["write → wrote", "yozmoq"],
    ["have → had", "ega bo'lmoq"],
    ["get → got · see → saw · say → said", "olmoq · ko'rmoq · aytmoq"]
  ],
  examples: [["I sent the photos to my mum.", "Rasmlarni oyimga yubordim."], ["We went to Samarkand last week.", "O'tgan hafta Samarqandga bordik."]],
  drill: [
    {q:"I ___ to work by metro yesterday.", o:["goed","went","go"], a:1, why:"go → went."},
    {q:"I ___ the photos to my mum.", o:["sended","sent","send"], a:1, why:"send → sent."},
    {q:"She ___ a cake yesterday.", o:["made","maked","make"], a:0, why:"make → made."},
    {q:"We ___ a meeting this morning.", o:["haved","had","has"], a:1, why:"have → had."},
    {q:"He ___ the code yesterday.", o:["wrote","writed","write"], a:0, why:"write → wrote."},
    {q:"I ___ my homework yesterday.", o:["did","doed","do"], a:0, why:"do → did."}
  ]
},
{
  id: "pastq", unit: 9, title: "Qilmadim: didn't · Qildingmi: Did ...?",
  lead: "O'tgan zamonda don't/doesn't o'rniga didn't, Do/Does o'rniga Did ishlatiladi. Did dan keyin fe'l oddiy shaklda bo'ladi, -ed qo'shilmaydi.",
  rules: [
    ["I didn't work yesterday.", "Kecha ishlamadim"],
    ["Did you send it?", "Yubordingizmi?"],
    ["Did you went ✗ → Did you go ✓", "Did + oddiy shakl"],
    ["Yes, I did. / No, I didn't.", "Qisqa javob"]
  ],
  examples: [["I didn't see the message.", "Xabarni ko'rmadim."], ["Did you finish your homework?", "Uy vazifangizni tugatdingizmi?"]],
  drill: [
    {q:"I ___ go to work yesterday.", o:["didn't","don't","wasn't"], a:0, why:"Kecha (o'tgan zamon): didn't."},
    {q:"___ you send the file?", o:["Do","Did","Were"], a:1, why:"O'tgan zamon savoli: Did."},
    {q:"Did she ___ the email?", o:["sent","send","sends"], a:1, why:"Did dan keyin oddiy shakl: send."},
    {q:"Did you like it? — Yes, I ___.", o:["did","do","was"], a:0, why:"Did bilan so'radi, javob: Yes, I did."},
    {q:"He didn't ___ the meeting.", o:["liked","like","likes"], a:1, why:"didn't dan keyin oddiy shakl: like."}
  ]
},
{
  id: "this", unit: 2, title: "this / that / these / those",
  lead: "Narsani ko'rsatish: yaqindagisi — this/these, uzoqdagisi — that/those. Bitta bo'lsa this/that, ko'p bo'lsa these/those.",
  rules: [
    ["this — bu (yaqin, bitta)", "This is my laptop."],
    ["these — bular (yaqin, ko'p)", "These are my keys."],
    ["that — anavi (uzoq, bitta)", "What's that?"],
    ["those — anavilar (uzoq, ko'p)", "Those buildings are new."],
    ["this/that + is · these/those + are", "These is ✗ → These are ✓"]
  ],
  examples: [["This is my friend Aziz.", "Bu mening do'stim Aziz."], ["What are those?", "Anavilar nima?"]],
  drill: [
    {q:"___ is my phone. (qo'limda, bitta)", o:["This","These","Those"], a:0, why:"Yaqinda, bitta — this."},
    {q:"___ are my keys. (qo'limda, ko'p)", o:["This","These","That"], a:1, why:"Yaqinda, ko'p — these."},
    {q:"What's ___? (uzoqda, bitta)", o:["that","those","these"], a:0, why:"Uzoqda, bitta — that."},
    {q:"___ buildings are very tall. (uzoqda, ko'p)", o:["That","Those","This"], a:1, why:"Uzoqda, ko'p — those."},
    {q:"These ___ my friends.", o:["is","are","am"], a:1, why:"these — ko'p, shuning uchun are."}
  ]
},
{
  id: "pron", unit: 3, title: "I → my: kim va kimning",
  lead: "Har bir olmoshning \"kimning\" shakli bor: I → my (men → mening). Ism o'rnida olmosh ishlatiladi: Aziz → he, Aziza → she, kitob → it.",
  rules: [
    ["I → my", "men → mening"],
    ["you → your", "sen/siz → sening/sizning"],
    ["he → his · she → her", "u (erkak) → uning · u (ayol) → uning"],
    ["it → its", "u (narsa) → uning"],
    ["we → our · they → their", "biz → bizning · ular → ularning"]
  ],
  examples: [["Aziz is my neighbour. He works in a hospital.", "Aziz mening qo'shnim. U kasalxonada ishlaydi."], ["This is Aziza. Her brother is a doctor.", "Bu Aziza. Uning akasi shifokor."]],
  drill: [
    {q:"Aziz is my neighbour. ___ is very friendly.", o:["He","She","His"], a:0, why:"Aziz — erkak, gap boshida (kim?) — He."},
    {q:"Aziza is a teacher. ___ son is ten.", o:["She","His","Her"], a:2, why:"Azizaning (ayol) o'g'li — Her."},
    {q:"I'm from Tashkent. ___ name is Ali.", o:["I","My","Me"], a:1, why:"Mening ismim — My."},
    {q:"We live in Tashkent. ___ flat is small.", o:["Our","We","Their"], a:0, why:"Bizning kvartiramiz — Our."},
    {q:"My parents live in Samarkand. ___ house is big.", o:["They","Their","Her"], a:1, why:"Ularning uyi — Their."},
    {q:"Is that Jasur? What's ___ job?", o:["he","his","her"], a:1, why:"Jasurning (erkak) ishi — his."}
  ]
},
{
  id: "prep", unit: 2, title: "in / on / near / next to",
  lead: "Narsa qayerda turganini aytish. O'zbekchada -da qo'shimchasi bor, inglizchada so'z oldiga alohida so'z qo'yiladi.",
  rules: [
    ["in — ichida", "My keys are in my bag."],
    ["on — ustida", "The phone is on the table."],
    ["near — yaqinida", "My house is near the metro."],
    ["next to — yonida (yonma-yon)", "The bank is next to the café."],
    ["Shahar, mamlakat — doim in", "in Tashkent, in Uzbekistan"]
  ],
  examples: [["The office is near Amir Temur Square.", "Ofis Amir Temur xiyoboni yaqinida."], ["My laptop is on the desk.", "Noutbukim stol ustida."]],
  drill: [
    {q:"My wallet is ___ my bag.", o:["in","on","next to"], a:0, why:"Sumka ichida — in."},
    {q:"The book is ___ the table.", o:["in","on","near"], a:1, why:"Stol ustida — on."},
    {q:"My aunt lives ___ Bukhara.", o:["on","in","at"], a:1, why:"Shahar — doim in."},
    {q:"The bank is ___ the café. (yonma-yon)", o:["next to","in","on"], a:0, why:"Yonma-yon — next to."},
    {q:"My house is ___ the metro. (5 daqiqa)", o:["on","near","in"], a:1, why:"Yaqinida — near."}
  ]
},
{
  id: "time", unit: 2, title: "Soat necha? What time is it?",
  lead: "Soatni aytish: to'liq soat — o'clock, yarim — half past, chorak — quarter past / quarter to.",
  rules: [
    ["What time is it? / What's the time?", "Soat necha?"],
    ["It's ten o'clock. (10:00)", "Soat o'n"],
    ["It's half past ten. (10:30)", "O'n yarim"],
    ["It's quarter past ten. (10:15)", "O'n o'n besh"],
    ["It's quarter to eleven. (10:45)", "O'n birga chorak qoldi"],
    ["It's ten twenty. (10:20)", "Oddiy usul: soat + daqiqa"]
  ],
  examples: [["The meeting is at half past two.", "Uchrashuv soat ikki yarimda."], ["I start work at eleven o'clock.", "Ishni soat o'n birda boshlayman."]],
  drill: [
    {q:"10:00 — It's ten ___.", o:["o'clock","half","past"], a:0, why:"To'liq soat — o'clock."},
    {q:"9:30 — It's ___ nine.", o:["quarter past","half past","half to"], a:1, why:"Yarim — half past."},
    {q:"3:15 — It's ___ three.", o:["quarter to","half past","quarter past"], a:2, why:"Soatdan 15 daqiqa o'tgan — quarter past."},
    {q:"7:45 — It's quarter ___ eight.", o:["past","to","at"], a:1, why:"Sakkizga 15 daqiqa qoldi — quarter to."},
    {q:"The meeting is ___ 11 o'clock.", o:["in","on","at"], a:2, why:"Soat oldidan — at."}
  ]
},
{
  id: "there", unit: 6, title: "There is / There are",
  lead: "\"...da ... bor\" — joyda nima borligini aytish. Bitta narsa — There's, ko'p — There are.",
  rules: [
    ["There's a bank near my house.", "Uyim yonida bank bor (1 ta)"],
    ["There are two cafés on my street.", "Ko'chamda ikkita kafe bor (ko'p)"],
    ["Is there a ...? / Are there any ...?", "... bormi?"],
    ["There isn't a ... / There aren't any ...", "... yo'q"]
  ],
  examples: [["There's a swimming pool in the park.", "Parkda basseyn bor."], ["There are a lot of modern buildings.", "Ko'p zamonaviy binolar bor."]],
  drill: [
    {q:"There ___ a supermarket near my house.", o:["is","are","have"], a:0, why:"a supermarket — bitta → is."},
    {q:"There ___ three banks on my street.", o:["is","are","has"], a:1, why:"three banks — ko'p → are."},
    {q:"___ there a cinema in your town?", o:["Is","Are","Do"], a:0, why:"a cinema — bitta → Is there."},
    {q:"There ___ any shops here.", o:["isn't","aren't","don't"], a:1, why:"shops — ko'p → aren't."}
  ]
},
{
  id: "isthere", unit: 6, title: "Is there ...? / Are there ...? — bormi?",
  lead: "Mehmonxonada yoki shaharda biror narsa borligini so'rash (6.2). Bitta narsa — Is there, ko'p — Are there any. Javob qisqa: Yes, there is / No, there isn't.",
  rules: [
    ["Is there a gym? — Yes, there is. / No, there isn't.", "Sport zal bormi? — Ha, bor. / Yo'q."],
    ["Are there any towels? — Yes, there are. / No, there aren't.", "Sochiqlar bormi? — Ha, bor. / Yo'q."],
    ["Is there Wi-Fi? (a yo'q)", "Wi-Fi, water, air conditioning — sanalmaydi, a qo'yilmaydi"],
    ["There are toilets. → They are next to the gym.", "There are — bor; They are — ular (qayerda ekanini aytish)"]
  ],
  examples: [["Is there a car park? — Yes, there is.", "Mashina to'xtash joyi bormi? — Ha, bor."], ["Are there any towels in the room? — No, there aren't.", "Xonada sochiqlar bormi? — Yo'q."], ["Where are the lifts? — They're next to reception.", "Liftlar qayerda? — Ular qabulxona yonida."]],
  drill: [
    {q:"___ there a safe in the room?", o:["Is","Are","Has"], a:0, why:"a safe — bitta → Is there."},
    {q:"___ there any towels?", o:["Is","Are","Do"], a:1, why:"towels — ko'p → Are there any."},
    {q:"Is there a gym? — Yes, there ___.", o:["is","are","it is"], a:0, why:"Qisqa javob: Yes, there is."},
    {q:"Are there any shops? — No, there ___.", o:["isn't","aren't","don't"], a:1, why:"Ko'plik → No, there aren't."},
    {q:"Is there ___ Wi-Fi in the hotel?", o:["a","—","an"], a:1, why:"Wi-Fi sanalmaydi → Is there Wi-Fi? (a yo'q)."},
    {q:"Where are the toilets? — ___ next to the gym.", o:["There are","They are","It is"], a:1, why:"Joyini aytamiz → They are (ular)."}
  ]
},
{
  id: "each", unit: 6, title: "each / all the",
  lead: "each — har bir (bittadan, birlik bilan). all the — hammasi (ko'plik bilan).",
  rules: [
    ["each + birlik + has/is", "Each flat has got a kitchen."],
    ["all the + ko'plik + have/are", "All the flats have got a kitchen."],
    ["Each rooms ✗ → Each room ✓", "each dan keyin -s yo'q"]
  ],
  examples: [["Each room has got a TV.", "Har bir xonada televizor bor."], ["All the rooms are clean.", "Hamma xonalar toza."]],
  drill: [
    {q:"___ room has got a desk.", o:["Each","All the","Every the"], a:0, why:"room — birlik, shuning uchun Each."},
    {q:"___ students are in the classroom.", o:["Each","All the","Each the"], a:1, why:"students — ko'plik, shuning uchun All the."},
    {q:"Each flat ___ got a balcony.", o:["have","has","are"], a:1, why:"each + birlik — has."},
    {q:"All the shops ___ open today.", o:["is","are","has"], a:1, why:"all the + ko'plik — are."}
  ]
},
{
  id: "can", unit: 7, title: "can / can't — qila olaman",
  lead: "can — qila olaman, can't — qila olmayman. Hamma uchun bir xil: u (he/she) uchun ham -s yo'q. can dan keyin fe'l oddiy shaklda, to qo'yilmaydi.",
  rules: [
    ["I / He / They can swim.", "suza olaman / oladi"],
    ["I can't drive.", "haydashni bilmayman"],
    ["Can you ...? — Yes, I can. / No, I can't.", "...a olasizmi? (do kerak emas)"],
    ["Can you help me?", "Iltimos ham shunday so'raladi"],
    ["She cans ✗ · I can to swim ✗ · Do you can ✗", "uchta xato shakl"]
  ],
  examples: [["I can cook plov.", "Palov pishira olaman."], ["Can you send me the file?", "Faylni menga yubora olasizmi?"]],
  drill: [
    {q:"She ___ speak three languages.", o:["cans","can","can to"], a:1, why:"can hamma uchun bir xil, -s yo'q."},
    {q:"I can ___ English a little.", o:["speak","speaking","to speak"], a:0, why:"can dan keyin fe'l oddiy shaklda."},
    {q:"___ you drive?", o:["Do","Can","Are"], a:1, why:"can savolida do kerak emas: Can you ...?"},
    {q:"Can you swim? — No, I ___.", o:["don't","can't","not"], a:1, why:"Can bilan so'radi, javob: No, I can't."},
    {q:"___ you help me, please?", o:["Can","Do","Are"], a:0, why:"Iltimos qilish — Can you ...?"}
  ]
},
{
  id: "like", unit: 7, title: "like / love / hate + -ing",
  lead: "Nimani yoqtirishni aytish: like (yoqtiraman), love (juda yoqtiraman), hate (yomon ko'raman). Harakat bo'lsa fe'lga -ing qo'shiladi.",
  rules: [
    ["I like + fe'l-ing", "I like reading."],
    ["I love + fe'l-ing · I hate + fe'l-ing", "I love travelling. I hate cooking."],
    ["dance → dancing · write → writing", "-e tushib qoladi"],
    ["swim → swimming · get → getting", "oxirgi harf ikki marta"],
    ["Narsa bo'lsa: I like coffee / films", "-ing kerak emas"]
  ],
  examples: [["I like playing football.", "Futbol o'ynashni yoqtiraman."], ["She doesn't like cooking.", "U ovqat qilishni yoqtirmaydi."]],
  drill: [
    {q:"I like ___ films.", o:["watch","watching","to watching"], a:1, why:"like + harakat — -ing: watching."},
    {q:"She loves ___.", o:["danceing","dancing","dances"], a:1, why:"-e bilan tugasa -e tushadi: dancing."},
    {q:"I hate ___ early.", o:["get up","getting up","geting up"], a:1, why:"get — oxirgi t ikki marta: getting."},
    {q:"Do you like ___?", o:["swiming","swimming","swim"], a:1, why:"swim — oxirgi m ikki marta: swimming."},
    {q:"He ___ like travelling.", o:["don't","doesn't","isn't"], a:1, why:"He — doesn't."}
  ]
},
{
  id: "obj", unit: 8, title: "me / him / her — meni, uni",
  lead: "Fe'ldan keyin yoki so'z oldidagi so'zdan (with, to, for) keyin I emas, me ishlatiladi. O'zbekchadagi \"meni, menga\" ga o'xshaydi.",
  rules: [
    ["I → me · you → you", "meni/menga · seni/senga"],
    ["he → him · she → her · it → it", "uni/unga"],
    ["we → us · they → them", "bizni/bizga · ularni/ularga"],
    ["Fe'ldan keyin: Call me.", "Menga qo'ng'iroq qiling."],
    ["with/to/for dan keyin: Come with us.", "Biz bilan keling."]
  ],
  examples: [["Can you help me?", "Menga yordam bera olasizmi?"], ["I sent the file to him.", "Faylni unga yubordim."]],
  drill: [
    {q:"Can you call ___ tomorrow?", o:["I","me","my"], a:1, why:"Fe'ldan keyin — me."},
    {q:"Aziz is my neighbour. I play football with ___.", o:["he","him","his"], a:1, why:"with dan keyin — him."},
    {q:"Aziza is here. Can you help ___?", o:["she","her","hers"], a:1, why:"Fe'ldan keyin — her."},
    {q:"My parents are in Samarkand. I visit ___ every month.", o:["they","them","their"], a:1, why:"Fe'ldan keyin — them."},
    {q:"Come with ___!", o:["we","us","our"], a:1, why:"with dan keyin — us."}
  ]
},
{
  id: "ago", unit: 9, title: "ago — ... oldin",
  lead: "ago — \"oldin\". Vaqt so'zidan KEYIN turadi va o'tgan zamon bilan ishlatiladi: two years ago = ikki yil oldin.",
  rules: [
    ["vaqt + ago", "two days ago, a week ago, an hour ago"],
    ["O'tgan zamon bilan", "I started English two months ago."],
    ["ago two years ✗ → two years ago ✓", "ago oxirida turadi"],
    ["When did you ...? — ... ago.", "Qachon ...? — ... oldin."]
  ],
  examples: [["I started work here a year ago.", "Bu yerda bir yil oldin ishlay boshladim."], ["My sister called an hour ago.", "Singlim bir soat oldin qo'ng'iroq qildi."]],
  drill: [
    {q:"I started English two months ___.", o:["ago","before","last"], a:0, why:"vaqt + ago."},
    {q:"Qaysi to'g'ri?", o:["I met him ago three days.","I met him three days ago.","I meet him three days ago."], a:1, why:"ago vaqtdan keyin turadi, fe'l o'tgan zamonda: met."},
    {q:"She left ___ hour ago.", o:["a","an","one the"], a:1, why:"hour — h o'qilmaydi, shuning uchun an hour."},
    {q:"When ___ you start your job? — A year ago.", o:["do","did","are"], a:1, why:"ago — o'tgan zamon, shuning uchun did."}
  ]
},
{
  id: "goingto", unit: 10, title: "going to — ...moqchiman (reja)",
  lead: "Kelajakdagi reja: am/is/are + going to + fe'l. \"Ertaga ... qilmoqchiman\" deyish uchun.",
  rules: [
    ["I'm going to + fe'l", "I'm going to study English."],
    ["He's / She's going to ...", "U ... qilmoqchi"],
    ["Inkor: I'm not going to ...", "...moqchi emasman"],
    ["Savol: Are you going to ...? — Yes, I am. / No, I'm not.", "...moqchimisiz?"],
    ["Vaqt: tomorrow, next week, next year", "ertaga, keyingi hafta, keyingi yil"]
  ],
  examples: [["I'm going to clean the flat tomorrow.", "Ertaga kvartirani tozalamoqchiman."], ["We're going to travel to Dubai next month.", "Keyingi oy Dubayga bormoqchimiz."]],
  drill: [
    {q:"I ___ going to study tonight.", o:["am","is","do"], a:0, why:"I — am going to."},
    {q:"She's going to ___ a new job.", o:["start","starts","starting"], a:0, why:"going to dan keyin fe'l oddiy shaklda."},
    {q:"___ you going to call your mum?", o:["Do","Are","Is"], a:1, why:"you — Are you going to ...?"},
    {q:"Are they going to come? — No, they ___.", o:["don't","aren't","not"], a:1, why:"Are bilan so'radi, javob: No, they aren't."},
    {q:"We ___ going to work on Sunday. (emas)", o:["aren't","don't","isn't"], a:0, why:"We — aren't going to."}
  ]
},
{
  id: "would", unit: 10, title: "would like — ...ni xohlayman",
  lead: "Muloyim so'rash: I'd like = I would like (xohlardim). Kafe va do'konda want o'rniga shu ishlatiladi.",
  rules: [
    ["I'd like + narsa", "I'd like a coffee, please."],
    ["I'd like + to + fe'l", "I'd like to pay by card."],
    ["Would you like ...? — Yes, please. / No, thanks.", "...xohlaysizmi?"],
    ["Hamma uchun bir xil: She'd like", "-s qo'shilmaydi"]
  ],
  examples: [["I'd like to order, please.", "Buyurtma bermoqchiman."], ["Would you like some tea?", "Choy ichasizmi?"]],
  drill: [
    {q:"I'd like ___ coffee, please.", o:["a","to","the a"], a:0, why:"like + narsa: a coffee."},
    {q:"I'd like ___ by card.", o:["pay","to pay","paying"], a:1, why:"like + fe'l: to qo'yiladi — to pay."},
    {q:"Would you like some water? — Yes, ___.", o:["please","I would like","I like"], a:0, why:"Javob: Yes, please."},
    {q:"She ___ like a cake.", o:["woulds","would","wants"], a:1, why:"would hamma uchun bir xil."},
    {q:"___ you like a menu?", o:["Do","Would","Are"], a:1, why:"Taklif qilish — Would you like ...?"}
  ]
}

];
