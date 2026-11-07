// ቅኔ with their chanted audio, for the ዜማ section. To add one: put the mp3 in
// assets/qine/ (an ASCII file name), then add an entry below. Types appear in
// the order of QINE_TYPES; a type with no entries yet is hidden.
//
// lines[].start / .end (seconds) are optional. When a line has them, it gets
// a button that loops just that line. blogId links the ቅኔ to its post in ቅኔ አበው
// (and the post back to the recording).

export const QINE_TYPES = [
  { key: "gubae-qana", name: "ጉባኤ ቃና" },
  { key: "zeamlakiye", name: "ዘአምላኪየ" },
  { key: "silasie", name: "ሥላሴ" },
  { key: "zeyieze", name: "ዘይእዜ" },
  { key: "mibezhu", name: "ሚበዝኁ" },
  { key: "wazema", name: "ዋዜማ" },
  { key: "kibr-yieti", name: "ክብር ይእቲ" },
  { key: "itane-moger", name: "ዕጣነ ሞገር" },
  { key: "mewedis", name: "መወድስ" },
];

export const QINE = [
  {
    id: "rebi-segede",
    number: 1,
    type: "gubae-qana",
    zema: "ግዕዝ",
    blogId: 74,
    title: "ረቢ ሰገደ",
    audio: require("../../assets/qine/geez-gubae-qana-rebi-segede.mp3"),
    lines: [
      { text: "ረቢ ሰገደ በመንፈቀ ሌሊት ለረቢ ።" },
      { text: "እኮኑ አጽባዕት እምነ አጽባዕት የዐቢ ።" },
    ],
  },
];

export const QINE_BY_ID = Object.fromEntries(QINE.map((q) => [q.id, q]));
export const typeName = (key) => QINE_TYPES.find((t) => t.key === key)?.name ?? key;
