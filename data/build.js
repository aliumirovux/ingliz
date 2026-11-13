// Gap tuzish — o'zbekcha gapga qarab inglizcha so'zlardan gap yig'iladi.
// u — o'zbekcha, e — to'g'ri gap, x — tuzoq so'zlar (ko'p uchraydigan xatolar), h — izoh.
window.BUILD = [
{unit: 1, items: [
  {u:"Men o'qituvchiman.", e:"I am a teacher.", x:["an","is"], h:"o'qituvchi — holat, shuning uchun am. Kasbdan oldin a."},
  {u:"Men Toshkentdanman.", e:"I am from Tashkent.", x:["in","is"], h:"...dan = from. I bilan am."},
  {u:"Siz ta'tildamisiz?", e:"Are you on holiday?", x:["Do","in"], h:"Holat savoli: Are gap boshida."},
  {u:"Men bu yerda o'qish uchun keldim.", e:"I am here to study.", x:["for","is"], h:"o'qish uchun = to study."},
  {u:"Ismingiz nima?", e:"What is your name?", x:["you","Where"], h:"nima = What. sizning = your."},
  {u:"Siz qayerdansiz?", e:"Where are you from?", x:["What","is"], h:"qayerdan = Where ... from. from gap oxirida."},
  {u:"Men ish safarida emasman.", e:"I am not on business.", x:["don't","in"], h:"Holat inkori: am not. do kerak emas."}
]},
{unit: 2, items: [
  {u:"Bu mening telefonim.", e:"This is my phone.", x:["These","are"], h:"Bitta, yaqinda — This is."},
  {u:"Bular mening kalitlarim.", e:"These are my keys.", x:["This","is"], h:"Ko'p, yaqinda — These are."},
  {u:"U shifokor. (ayol)", e:"She is a doctor.", x:["He","an"], h:"Ayol — She. doctor undosh bilan boshlanadi — a."},
  {u:"Ular muhandislar.", e:"They are engineers.", x:["is","an"], h:"Ko'plik — are, a/an qo'yilmaydi."},
  {u:"Bank metro yonida.", e:"The bank is next to the metro.", x:["in","on"], h:"yonida = next to."},
  {u:"Kalitlarim sumkamda.", e:"My keys are in my bag.", x:["on","is"], h:"keys — ko'p: are. Ichida — in."},
  {u:"Soat o'n yarim.", e:"It is half past ten.", x:["to","quarter"], h:"yarim = half past."}
]},
{unit: 3, items: [
  {u:"Menda mashina bor.", e:"I have got a car.", x:["has","am"], h:"I — have got."},
  {u:"Uning ikkita farzandi bor. (ayol)", e:"She has got two children.", x:["have","her"], h:"She — has got."},
  {u:"Sizda noutbuk bormi?", e:"Have you got a laptop?", x:["Do","has"], h:"have got savolida Have boshida."},
  {u:"Menda mushuk yo'q.", e:"I haven't got a cat.", x:["don't","hasn't"], h:"I — haven't got."},
  {u:"Aziz mening qo'shnim.", e:"Aziz is my neighbour.", x:["me","a"], h:"mening = my. my bor joyda a bo'lmaydi."},
  {u:"Uning rafiqasi o'qituvchi. (erkakning)", e:"His wife is a teacher.", x:["Her","He"], h:"Erkakning — His."},
  {u:"Bu Azizning mashinasi.", e:"This is Aziz's car.", x:["Aziz","car's"], h:"Azizning = Aziz's."}
]},
{unit: 4, items: [
  {u:"Men har kuni ishlayman.", e:"I work every day.", x:["am","works"], h:"ishla-moq — harakat: am kerak emas. I bilan -s yo'q."},
  {u:"U Dubayda ishlaydi. (erkak)", e:"He works in Dubai.", x:["is","work"], h:"He + harakat — -s qo'shiladi, is yo'q."},
  {u:"Men qahva ichmayman.", e:"I don't drink coffee.", x:["doesn't","am"], h:"I — don't."},
  {u:"U go'sht yemaydi. (ayol)", e:"She doesn't eat meat.", x:["don't","eats"], h:"She — doesn't, keyin -s yo'q."},
  {u:"Siz shu yerda ishlaysizmi?", e:"Do you work here?", x:["Are","Does"], h:"ishla-moq — harakat: Do you ...?"},
  {u:"Akangiz Toshkentda yashaydimi?", e:"Does your brother live in Tashkent?", x:["Do","lives"], h:"your brother = u: Does. Does dan keyin -s yo'q."},
  {u:"Men ishga metroda boraman.", e:"I go to work by metro.", x:["on","goes"], h:"metroda = by metro."}
]},
{unit: 5, items: [
  {u:"Men odatda soat yettida turaman.", e:"I usually get up at seven.", x:["in","gets"], h:"usually harakatdan oldin. Soatdan oldin at."},
  {u:"U doim kechikadi. (erkak)", e:"He is always late.", x:["does","never"], h:"always — is dan keyin."},
  {u:"Men hech qachon baliq yemayman.", e:"I never eat fish.", x:["don't","always"], h:"never o'zi inkor: don't kerak emas."},
  {u:"Siz qayerda ishlaysiz?", e:"Where do you work?", x:["are","does"], h:"Savol so'zi + do + you + harakat."},
  {u:"U soat nechada turadi? (ayol)", e:"What time does she get up?", x:["do","gets"], h:"she — does, keyin -s yo'q."},
  {u:"Men choyni yoqtiraman, lekin qahvani yoqtirmayman.", e:"I like tea but I don't like coffee.", x:["because","and"], h:"lekin = but."},
  {u:"Men ingliz tilini o'rganaman, chunki u ishim uchun kerak.", e:"I learn English because I need it for my work.", x:["but","am"], h:"chunki = because. learn — harakat, am kerak emas."}
]},
{unit: 6, items: [
  {u:"Uyim yonida bank bor.", e:"There is a bank near my house.", x:["are","has"], h:"Bitta narsa — There is."},
  {u:"Ko'chamda ikkita kafe bor.", e:"There are two cafes on my street.", x:["is","in"], h:"Ko'p — There are. Ko'chada — on."},
  {u:"Bu yerda Wi-Fi bormi?", e:"Is there Wi-Fi here?", x:["Are","Has"], h:"Savol: Is there ...?"},
  {u:"Bu yerda do'konlar yo'q.", e:"There aren't any shops here.", x:["isn't","some"], h:"Ko'plik inkori: aren't any."},
  {u:"Har bir xonada televizor bor.", e:"Each room has got a TV.", x:["have","All"], h:"each + birlik — has got."},
  {u:"Hamma xonalar toza.", e:"All the rooms are clean.", x:["Each","is"], h:"all the + ko'plik — are."}
]},
{unit: 7, items: [
  {u:"Men suza olaman.", e:"I can swim.", x:["to","am"], h:"can + oddiy fe'l, to yo'q."},
  {u:"U mashina hayday olmaydi. (ayol)", e:"She can't drive.", x:["doesn't","cans"], h:"can't hamma uchun bir xil."},
  {u:"Menga yordam bera olasizmi?", e:"Can you help me?", x:["Do","I"], h:"Can you ...? Fe'ldan keyin me."},
  {u:"Men kitob o'qishni yoqtiraman.", e:"I like reading books.", x:["read","to"], h:"like + -ing: reading."},
  {u:"U ovqat qilishni yomon ko'radi. (erkak)", e:"He hates cooking.", x:["hate","cook"], h:"He — hates. hate + -ing: cooking."},
  {u:"Siz sayohat qilishni yoqtirasizmi?", e:"Do you like travelling?", x:["Are","travel"], h:"like — harakat: Do you like ...?"}
]},
{unit: 8, items: [
  {u:"Kecha charchagan edim.", e:"I was tired yesterday.", x:["were","am"], h:"I — was."},
  {u:"Biz o'tgan hafta Dubayda edik.", e:"We were in Dubai last week.", x:["was","are"], h:"We — were."},
  {u:"Kecha kech ishladim.", e:"I worked late yesterday.", x:["was","work"], h:"Harakat: -ed, was kerak emas."},
  {u:"U 2020 yilda Toshkentga ko'chib o'tdi. (ayol)", e:"She moved to Tashkent in 2020.", x:["move","on"], h:"move → moved. Yildan oldin in."},
  {u:"Ertaga menga qo'ng'iroq qiling, iltimos.", e:"Please call me tomorrow.", x:["I","my"], h:"Fe'ldan keyin me."},
  {u:"Men u bilan ishlayman. (erkak)", e:"I work with him.", x:["he","his"], h:"with dan keyin him."}
]},
{unit: 9, items: [
  {u:"Kecha ishga bordim.", e:"I went to work yesterday.", x:["goed","go"], h:"go → went."},
  {u:"Men rasmlarni oyimga yubordim.", e:"I sent the photos to my mum.", x:["sended","send"], h:"send → sent."},
  {u:"Men xabarni ko'rmadim.", e:"I didn't see the message.", x:["saw","don't"], h:"didn't + oddiy shakl: see."},
  {u:"Faylni yubordingizmi?", e:"Did you send the file?", x:["sent","Do"], h:"Did + oddiy shakl: send."},
  {u:"Men ingliz tilini ikki oy oldin boshladim.", e:"I started English two months ago.", x:["before","start"], h:"vaqt + ago, gap oxirida."},
  {u:"U bir soat oldin qo'ng'iroq qildi. (erkak)", e:"He called an hour ago.", x:["a","calls"], h:"hour — h o'qilmaydi: an hour."}
]},
{unit: 10, items: [
  {u:"Men ertaga kvartirani tozalamoqchiman.", e:"I am going to clean the flat tomorrow.", x:["will","cleaning"], h:"am going to + oddiy fe'l."},
  {u:"Biz keyingi oy Dubayga bormoqchimiz.", e:"We are going to travel to Dubai next month.", x:["is","travelling"], h:"We — are going to."},
  {u:"Siz oyingizga qo'ng'iroq qilmoqchimisiz?", e:"Are you going to call your mum?", x:["Do","calling"], h:"Savol: Are you going to ...?"},
  {u:"Bitta qahva bersangiz.", e:"I would like a coffee, please.", x:["want","to"], h:"Muloyim so'rash: I would like + narsa."},
  {u:"Karta bilan to'lamoqchiman.", e:"I would like to pay by card.", x:["paying","with"], h:"would like + to + fe'l. Karta bilan = by card."},
  {u:"Choy ichasizmi?", e:"Would you like some tea?", x:["Do","want"], h:"Taklif: Would you like ...?"}
]}
];
