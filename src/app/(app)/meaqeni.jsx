import { ScreenContainer, ScreenHeader } from "../../components/ui";
import { KeneMeasureTable } from "../../components/KeneMeasureTable";

const gubaeQana = {
  title: "ጉባኤ ቃና",
  rowGroupLabel: "ኢታብ ዘጎ",
  receivingLabel: "ቶማስ",
  houseLabel: "ሰሐቀ",
  mewqeHeaderLabel: "ወልደ መጽብሕ",
  rows: [
    {
      medeb: "ወዳቂ 1-3",
      tekebali: { wedaqi: "አይአቱን", tetay: "3", tenesh: "3", siyaf: "4" },
      mewqe: "ወዳቂ 5-6",
      bet: [{ wedaqi: "3", tetay: "3", tenesh: "3", siyaf: "አይአቱን" }],
    },
    {
      medeb: "ተጣይ 2-4",
      tekebali: { wedaqi: "አይአቱን", tetay: "2-3", tenesh: "2-3", siyaf: "3-4" },
      mewqe: "ተጣይ 6-7",
      bet: [{ wedaqi: "2-3", tetay: "2-3", tenesh: "2-3", siyaf: "አይአቱን" }],
    },
    {
      medeb: "ተነሽ 2-4",
      tekebali: { wedaqi: "አይአቱን", tetay: "2", tenesh: "2", siyaf: "3" },
      mewqe: "ተነሽ 6-7\n5",
      bet: [
        { wedaqi: "2", tetay: "2", tenesh: "2", siyaf: "አይአቱን" },
        { wedaqi: "3", tetay: "3", tenesh: "3", siyaf: "አይአቱን" },
      ],
    },
    {
      medeb: "ስያፍ 3-5",
      tekebali: { wedaqi: "አይአቱን", tetay: "2", tenesh: "2", siyaf: "3" },
      mewqe: "ስያፍ 7-8\n6",
      bet: [
        { wedaqi: "2", tetay: "2", tenesh: "2", siyaf: "አይአቱን" },
        { wedaqi: "3", tetay: "3", tenesh: "3", siyaf: "አይአቱን" },
      ],
    },
  ],
};

const zeAmlakiye = {
  title: "ዘአምላኪየ",
  rowGroupLabel: "በታቢር",
  receivingLabel: "ወራኝ",
  houseLabel: "ወልድየ",
  mewqeHeaderLabel: "ወልድየ",
  rows: [
    {
      medeb: "ተጣይ 3-4",
      tekebali: { wedaqi: "3\n2", tetay: "6", tenesh: "6", siyaf: "6" },
      mewqe: "ወዳቂ 3",
      bet: [{ wedaqi: "3", tetay: "3", tenesh: "3", siyaf: "አይአቱን" }],
    },
    {
      medeb: "ተነሽ 3-4",
      tekebali: { wedaqi: "3\n2", tetay: "6", tenesh: "6", siyaf: "6" },
      mewqe: "ተጣይ 4",
      bet: [{ wedaqi: "2-3", tetay: "2-3", tenesh: "2-3", siyaf: "አይአቱን" }],
    },
    {
      medeb: "ስያፍ 4-5",
      tekebali: { wedaqi: "3\n2", tetay: "6", tenesh: "6", siyaf: "6" },
      mewqe: "ተነሽ 3-4",
      bet: [
        { wedaqi: "3", tetay: "3", tenesh: "3", siyaf: "አይአቱን" },
        { wedaqi: "2", tetay: "2", tenesh: "2", siyaf: "አይአቱን" },
      ],
    },
    {
      medeb: "ወዳቂ",
      tekebali: { wedaqi: "አይአቱን", tetay: "አይአቱን", tenesh: "አይአቱን", siyaf: "አይአቱን" },
      mewqe: "ስያፍ 4-5",
      bet: [
        { wedaqi: "3", tetay: "3", tenesh: "3", siyaf: "አይአቱን" },
        { wedaqi: "2", tetay: "2", tenesh: "2", siyaf: "አይአቱን" },
      ],
    },
  ],
};

export default function Meaqeni() {
  return (
    <ScreenContainer scroll>
      <ScreenHeader title="መዐቀኒ" titleEthiopic />
      <KeneMeasureTable {...gubaeQana} />
      <KeneMeasureTable {...zeAmlakiye} />
    </ScreenContainer>
  );
}
