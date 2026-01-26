import React from "react";
import { useLanguage } from "../contexts/LanguageContext";

export default function Reports() {
  const { t } = useLanguage();
  return <h2>📊 {t("reportsTitle")}</h2>;
}