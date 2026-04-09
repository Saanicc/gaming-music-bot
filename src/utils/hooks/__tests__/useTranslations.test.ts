/**
 * Tests for useTranslations hook and t utility function.
 * Testing translation retrieval, variable substitution, nested keys, and fallback mechanisms.
 * Mocks: @/db/language for guild language retrieval, @/ui/translations for locales.
 */
import { t, useTranslations } from "../useTranslations";
import { getBotLanguageFromCache } from "@/db/language";
import { LanguageCode } from "@/ui/translations";

jest.mock("@/db/language", () => ({
  getBotLanguageFromCache: jest.fn(),
}));

jest.mock("@/ui/translations", () => ({
  DEFAULT_LANGUAGE: "en-US",
  locales: {
    "en-US": {
      simple: "Hello",
      greeting: "Hello {{name}}",
      nested: {
        key: "Nested English",
      },
      fallbackOnly: "Only in English",
      numbers: "Value {{val1}} and {{val2}}",
    },
    "sv-SE": {
      simple: "Hej",
      greeting: "Hej {{name}}",
      nested: {
        key: "Nästlad Svenska",
      },
    },
  },
}));

describe("translations utility", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("t() function", () => {
    describe("when basic key is requested", () => {
      it("should return the correct translation for en-US", () => {
        expect(t("en-US", "simple")).toEqual("Hello");
      });

      it("should return the correct translation for sv-SE", () => {
        expect(t("sv-SE", "simple")).toEqual("Hej");
      });
    });

    describe("when a nested key is requested", () => {
      it("should return the correct nested value", () => {
        expect(t("en-US", "nested.key")).toEqual("Nested English");
        expect(t("sv-SE", "nested.key")).toEqual("Nästlad Svenska");
      });
    });

    describe("when key is missing in target language", () => {
      it("should fallback to DEFAULT_LANGUAGE", () => {
        // sv-SE is missing 'fallbackOnly'
        expect(t("sv-SE", "fallbackOnly")).toEqual("Only in English");
      });

      it("should return the key if missing in target and default language", () => {
        expect(t("en-US", "missing.key")).toEqual("missing.key");
      });
    });

    describe("when variables are provided", () => {
      it("should substitute a single variable correctly", () => {
        expect(t("en-US", "greeting", { name: "John" })).toEqual("Hello John");
        expect(t("sv-SE", "greeting", { name: "Maria" })).toEqual("Hej Maria");
      });

      it("should substitute multiple variables correctly", () => {
        expect(t("en-US", "numbers", { val1: "one", val2: "two" })).toEqual(
          "Value one and two"
        );
      });

      it("should return identical string if requested variable does not exist in template", () => {
        expect(t("en-US", "simple", { unused: "var" })).toEqual("Hello");
      });
    });

    describe("when invalid translation value is retrieved", () => {
      it("should return the key if value resolves to an object instead of string", () => {
        // nested resolves to the object { key: "Nested English" }
        expect(t("en-US", "nested")).toEqual("nested");
      });
    });
    
    describe("when language is completely invalid", () => {
      it("should gracefully switch to DEFAULT_LANGUAGE", () => {
        expect(t("invalid-lang" as LanguageCode, "simple")).toEqual("Hello");
      });
    });
  });

  describe("useTranslations() hook", () => {
    describe("when guild exists with configured language", () => {
      it("should wrap t() using the guild's selected language", () => {
        (getBotLanguageFromCache as jest.Mock).mockReturnValue("sv-SE");

        const translate = useTranslations("guild-123");
        expect(getBotLanguageFromCache).toHaveBeenCalledWith("guild-123");

        expect(translate("simple")).toEqual("Hej");
        expect(translate("greeting", { name: "Sven" })).toEqual("Hej Sven");
      });
    });

    describe("when guild has no configured language", () => {
      it("should fallback to DEFAULT_LANGUAGE", () => {
        (getBotLanguageFromCache as jest.Mock).mockReturnValue(undefined);

        const translate = useTranslations("guild-456");
        expect(getBotLanguageFromCache).toHaveBeenCalledWith("guild-456");

        expect(translate("simple")).toEqual("Hello");
      });
    });
  });
});
