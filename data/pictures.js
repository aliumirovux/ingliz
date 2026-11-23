// Picture prompt vocabulary (Fluent Emoji 3D, MIT: img/soz/LICENSE-fluent-emoji.txt)
// and control-group word list for retention A/B tracking.
window.PIC = {
  // Unit 3 (initial pilot)
  "bicycle": { f: "bicycle", alt: ["bike"] },
  "cat": { f: "cat", alt: ["kitten", "kitty"] },
  "coffee": { f: "coffee", alt: ["tea", "cup", "mug", "drink"] },
  "house": { f: "house", alt: ["home", "building", "hut"] },
  "mobile phone": { f: "mobile-phone", alt: ["phone", "mobile", "smartphone", "telephone", "cell phone", "tablet"] },
  "cold": { f: "cold", alt: ["freezing", "frozen", "cool"] },
  "seat": { f: "seat", alt: ["chair", "armchair"] },
  // Unit 1
  "hotel": { f: "hotel", alt: ["building", "hospital", "motel"] },
  // Unit 2
  "book": { f: "book", alt: ["notebook", "notepad", "textbook"] },
  "bag": { f: "bag", alt: ["handbag", "purse", "wallet"] },
  "key": { f: "key", alt: ["keys"] },
  "email": { f: "email", alt: ["e-mail", "mail", "letter", "envelope", "message"] },
  "apple": { f: "apple", alt: ["fruit"] },
  "train": { f: "train", alt: ["locomotive", "railway", "steam train"] },
  "road": { f: "road", alt: ["street", "highway", "motorway", "way"] },
  "station": { f: "station", alt: ["train", "train station", "railway", "metro"] },
  // Unit 3
  "toilet": { f: "toilet", alt: ["wc", "bathroom"] },
  "boy": { f: "boy", alt: ["child", "kid", "man", "son"] },
  "man": { f: "man", alt: ["person", "guy", "boy", "men"] },
  // Unit 4
  "basketball": { f: "basketball", alt: ["ball"] },
  "newspaper": { f: "newspaper", alt: ["paper", "news", "magazine"] },
  "factory": { f: "factory", alt: ["plant", "building"] },
  "baseball": { f: "baseball", alt: ["ball"] },
  "ticket": { f: "ticket", alt: ["tickets"] },
  "dollar": { f: "dollar", alt: ["dollars", "money", "cash"] },
  "ferry": { f: "ferry", alt: ["ship", "boat"] },
  // Unit 5
  "jeans": { f: "jeans", alt: ["trousers", "pants"] },
  "hand": { f: "hand", alt: ["hands", "palm", "arm"] },
  "wind": { f: "wind", alt: ["windy", "air"] },
  "jacket": { f: "jacket", alt: ["coat"] },
  "leg": { f: "leg", alt: ["legs", "foot"] },
  "stadium": { f: "stadium", alt: [] },
  "sun": { f: "sun", alt: ["sunny"] },
  "bank": { f: "bank", alt: ["building"] },
  "cinema": { f: "cinema", alt: ["film", "movie", "camera"] },
  // Unit 6
  "bath": { f: "bath", alt: ["bathtub", "bathroom", "shower"] },
  "lift": { f: "lift", alt: ["elevator"] },
  "sofa": { f: "sofa", alt: ["couch", "lamp", "armchair"] },
  "bed": { f: "bed", alt: ["bedroom"] },
  "tea": { f: "tea", alt: ["cup", "coffee", "drink"] },
  // Unit 7
  "parrot": { f: "parrot", alt: ["bird"] },
  "paintbrush": { f: "paintbrush", alt: ["brush"] },
  "box": { f: "box", alt: ["package", "parcel"] },
  "bird": { f: "bird", alt: ["parrot"] },
  "run": { f: "run", alt: ["running", "runner"] },
  // Unit 8
  "horse": { f: "horse", alt: [] },
  "birthday": { f: "birthday", alt: ["cake", "party"] },
  // Unit 9
  "rainy": { f: "rainy", alt: ["rain", "raining"] },
  "knife": { f: "knife", alt: [] },
  "temperature": { f: "temperature", alt: ["thermometer", "hot", "cold", "fever"] },
  "stormy": { f: "stormy", alt: ["storm", "rain", "rainy", "thunder", "lightning"] },
  // Unit 10
  "doughnut": { f: "doughnut", alt: ["donut"] },
  "milk": { f: "milk", alt: ["glass"] },
  "cupcake": { f: "cupcake", alt: ["cake", "muffin"] },
  "island": { f: "island", alt: ["beach"] },
  "burger": { f: "burger", alt: ["hamburger", "cheeseburger"] },
  "hot dog": { f: "hot-dog", alt: ["hotdog"] },
  "croissant": { f: "croissant", alt: [] },
  // Prepositions (Units 1-2): excluded from picture pilot stats (x: 1)
  "in": { f: "prep-in", alt: ["inside", "into", "in the box"], cap: "To'p qayerda? Inglizcha yozing", x: 1 },
  "on": { f: "prep-on", alt: ["on top of", "on top", "above", "over", "on the box"], cap: "To'p qayerda? Inglizcha yozing", x: 1 },
  "next to": { f: "prep-next-to", alt: ["near", "beside", "by", "next", "next to the box"], cap: "To'p qayerda? Inglizcha yozing", x: 1 }
};

window.PIC_CONTROL = [
  /* Unit 3 (initial) */ "car", "dog", "tv", "painting", "shop", "hot", "artist",
  /* Unit 1 */ "map",
  /* Unit 2 */ "laptop", "school", "bus", "notepad", "hospital", "pen", "umbrella",
  /* Unit 3 */ "woman", "child", "world", "girl",
  /* Unit 4 */ "beach", "tennis", "pound", "department store", "euro", "motorbike", "guitar",
  /* Unit 5 */ "dress", "flower", "wood", "trainers", "shoes", "t-shirt", "music", "shawl",
  /* Unit 6 */ "mountains", "shower", "theatre", "fishing", "chair", "pizza",
  /* Unit 7 */ "gorilla", "dolphin", "swim", "electric piano",
  /* Unit 8 */ "party", "scientist", "astronaut",
  /* Unit 9 */ "cloudy", "meat", "receipt", "snowy",
  /* Unit 10 */ "rice", "sandwich", "cake", "chips", "salad", "flight", "biscuit"
];
