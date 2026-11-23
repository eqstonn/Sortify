// Home's "Discover weekly" section: a heading with "See all", then chunky rows
// (icon tile, title, one-line hint, chevron). The first row is this week's
// bonus item; the others rotate weekly (lib/discover.ts).
//
// Tapping a row opens a sheet with the item's bin and tips from GET /categories.
// "See all" opens a sheet listing every tricky item.

import { Check, ChevronRight } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import BinCard from "@/components/BinCard";
import Card from "@/components/Card";
import IconTile from "@/components/IconTile";
import Sheet from "@/components/Sheet";
import { api, type Category, type DiscoverOut } from "@/lib/api";
import { iconFor, TRICKY, trickyThisWeek } from "@/lib/discover";
import { makeStyles, useTheme } from "@/lib/theme";
import { fonts, radius, spacing } from "@/theme";

type Row = {
  key: string;
  categoryId: string;
  title: string;
  line: string;
  bonus?: number; // this week's item only
  found?: boolean;
  explainer?: string;
};

// GET /categories rarely changes: fetch it once per app run (again after a failure)
let categoriesOnce: Promise<Category[]> | null = null;
function loadCategories(): Promise<Category[]> {
  categoriesOnce ??= api.categories().catch((e) => {
    categoriesOnce = null;
    throw e;
  });
  return categoriesOnce;
}

function weeklyRow(d: DiscoverOut): Row {
  return {
    key: "weekly",
    categoryId: d.category_id,
    title: d.item,
    line: d.tips[0] ?? d.explainer,
    bonus: d.bonus_points,
    found: d.found,
    explainer: d.explainer,
  };
}

export default function DiscoverRows({ discover }: { discover: DiscoverOut | null }) {
  const [open, setOpen] = useState<Row | null>(null);
  const [all, setAll] = useState(false);
  const { type } = useTheme();
  const s = useStyles();

  const tricky = trickyThisWeek(discover ? 2 : 3, discover?.category_id).map((t) => ({ key: t.categoryId, ...t }));
  const rows: Row[] = discover ? [weeklyRow(discover), ...tricky] : tricky;

  return (
    <View style={s.section} testID="discover">
      <View style={s.header}>
        <Text style={type.heading}>Discover weekly</Text>
        <Pressable onPress={() => setAll(true)} hitSlop={10} accessibilityRole="button">
          <Text style={s.link}>See all</Text>
        </Pressable>
      </View>

      {rows.map((r) => (
        <DiscoverRow key={r.key} row={r} onPress={() => setOpen(r)} />
      ))}

      <Sheet visible={all} title="Tricky items" onClose={() => setAll(false)}>
        {TRICKY.map((t) => (
          <DiscoverRow
            key={t.categoryId}
            row={{ key: t.categoryId, ...t }}
            onPress={() => {
              setAll(false);
              setOpen({ key: t.categoryId, ...t });
            }}
          />
        ))}
      </Sheet>

      <DetailSheet row={open} onClose={() => setOpen(null)} />
    </View>
  );
}

function DiscoverRow({ row, onPress }: { row: Row; onPress: () => void }) {
  const { colors, type } = useTheme();
  const s = useStyles();
  return (
    <Card onPress={onPress} padding={12} style={s.row} accessibilityLabel={`${row.title}. ${row.line}`} testID={`discover-${row.key}`}>
      <IconTile icon={iconFor(row.categoryId)} size={48} />
      <View style={s.rowText}>
        <Text style={type.cardTitle} numberOfLines={1}>
          {row.title}
        </Text>
        <Text style={type.caption} numberOfLines={1}>
          {row.line}
        </Text>
      </View>
      {row.found ? (
        <View style={[s.bonus, s.found]}>
          <Check size={14} color={colors.progress} strokeWidth={2.5} />
        </View>
      ) : row.bonus ? (
        <View style={s.bonus}>
          <Text style={s.bonusText}>+{row.bonus}</Text>
        </View>
      ) : null}
      <ChevronRight size={22} color={colors.text} strokeWidth={2} />
    </Card>
  );
}

function DetailSheet({ row, onClose }: { row: Row | null; onClose: () => void }) {
  // What came back, and for which item: a result for another item is just ignored
  const [loaded, setLoaded] = useState<{ id: string; category: Category | null; failed: boolean } | null>(null);
  const { type } = useTheme();
  const s = useStyles();
  const categoryId = row?.categoryId;
  const current = loaded && loaded.id === categoryId ? loaded : null;
  const category = current?.category ?? null;
  const failed = !!current?.failed;

  useEffect(() => {
    if (!categoryId) return;
    loadCategories().then(
      (all) => setLoaded({ id: categoryId, category: all.find((c) => c.id === categoryId) ?? null, failed: false }),
      () => setLoaded({ id: categoryId, category: null, failed: true }),
    );
  }, [categoryId]);

  return (
    <Sheet visible={!!row} title={row?.title ?? ""} onClose={onClose}>
      {row?.bonus ? (
        <Text style={type.body}>
          {row.found ? "You found this week's item. Bonus collected!" : `This week's bonus item: +${row.bonus} points when you sort one.`}
        </Text>
      ) : null}
      {row?.explainer ? <Text style={type.body}>{row.explainer}</Text> : null}
      {category ? (
        <>
          <BinCard bin={category.bin} />
          {category.tips.map((tip) => (
            <View key={tip} style={s.tip}>
              <View style={s.dot} />
              <Text style={[type.body, s.tipText]}>{tip}</Text>
            </View>
          ))}
        </>
      ) : (
        <Text style={type.caption}>{failed ? "Couldn't load the details. Check your connection." : row?.line}</Text>
      )}
    </Sheet>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  section: { gap: 12 },
  header: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 2 },
  link: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text, textDecorationLine: "underline" },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingRight: 14, minHeight: 72 },
  rowText: { flex: 1, gap: 2 },
  bonus: { minWidth: 28, height: 24, borderRadius: radius.pill, paddingHorizontal: 8, alignItems: "center", justifyContent: "center", backgroundColor: colors.terracotta },
  found: { backgroundColor: colors.accentSoft },
  bonusText: { fontFamily: fonts.heading, fontSize: 13, color: colors.onTerracotta },
  tip: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.progress, marginTop: 8 },
  tipText: { flex: 1 },
}));
