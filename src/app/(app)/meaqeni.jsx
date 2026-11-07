import { useState } from "react";
import { ScreenContainer, Tabs } from "../../components/ui";
import { MeterChecker } from "../../components/MeterChecker";
import { MeterTables } from "../../components/MeterTables";

const TABS = [
  { key: "checker", label: "Measure" },
  { key: "tables", label: "Tables" },
];

export default function Meaqeni() {
  const [tab, setTab] = useState("checker");

  return (
    <ScreenContainer scroll keyboardAvoiding>
      <Tabs tabs={TABS} value={tab} onChange={setTab} />

      {tab === "checker" ? <MeterChecker /> : <MeterTables />}
    </ScreenContainer>
  );
}
