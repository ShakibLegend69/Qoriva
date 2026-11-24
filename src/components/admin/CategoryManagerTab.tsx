import { useMemo, useState } from 'react';
import { Check, FolderPlus, Plus, Trash2 } from 'lucide-react';
import type { Article, Category, CategorySlug, Subcategory } from '../../types/qorvia';
import { computeTagUsageCounts, slugifyTitle } from '../../lib/editorialValidation';
import { deleteCategoryInFirestore, saveCategoryInFirestore } from '../../lib/firestoreService';

interface CategoryManagerTabProps {
  actorUid: string;
  actorEmail?: string | null;
  categories: Category[];
  articles: Article[];
  hasRoleAdminPermission: boolean;
}

export function CategoryManagerTab({
  actorUid,
  actorEmail,
  categories,
  articles,
  hasRoleAdminPermission,
}: CategoryManagerTabProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    () => categories[0]?.id ?? 'technology'
  );
  const selectedCategory =
    categories.find((c) => c.id === selectedCategoryId) ?? categories[0] ?? null;

  // Edit / New Category form
  const [creatingNew, setCreatingNew] = useState(false);
  const [catSlug, setCatSlug] = useState('');
  const [catNameEn, setCatNameEn] = useState('');
  const [catNameBn, setCatNameBn] = useState('');
  const [catDescEn, setCatDescEn] = useState('');
  const [catDescBn, setCatDescBn] = useState('');

  // Subcategory form
  const [subNameEn, setSubNameEn] = useState('');
  const [subNameBn, setSubNameBn] = useState('');
  const [subSlug, setSubSlug] = useState('');
  const [subDescEn, setSubDescEn] = useState('');
  const [subDescBn, setSubDescBn] = useState('');

  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(
    null
  );
  const [confirmDeleteCatId, setConfirmDeleteCatId] = useState<string | null>(null);

  const tagStats = useMemo(() => computeTagUsageCounts(articles), [articles]);

  const handleSaveNewCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const cleanSlug = (catSlug.trim() || slugifyTitle(catNameEn, 'cat'))
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-');
    if (!catNameEn.trim() || !catNameBn.trim()) {
      setFeedback({
        type: 'error',
        text: 'Both English and Bengali category names are required.',
      });
      return;
    }

    setBusy(true);
    try {
      const nextCat: Category = {
        id: cleanSlug as CategorySlug,
        slug: cleanSlug as CategorySlug,
        name: { en: catNameEn.trim(), bn: catNameBn.trim() },
        shortName: { en: catNameEn.trim(), bn: catNameBn.trim() },
        description: { en: catDescEn.trim(), bn: catDescBn.trim() },
        isActive: true,
        subcategories: [],
      };
      await saveCategoryInFirestore({ actorUid, actorEmail, category: nextCat });
      setCreatingNew(false);
      setSelectedCategoryId(cleanSlug);
      setCatSlug('');
      setCatNameEn('');
      setCatNameBn('');
      setCatDescEn('');
      setCatDescBn('');
      setFeedback({ type: 'success', text: `Category "${nextCat.name.en}" saved to Firestore.` });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save category.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleToggleCategoryActive = async (category: Category) => {
    setFeedback(null);
    setBusy(true);
    try {
      await saveCategoryInFirestore({
        actorUid,
        actorEmail,
        category: { ...category, isActive: category.isActive === false },
      });
      setFeedback({
        type: 'success',
        text: `Updated active state for ${category.name.en}.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update category.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleAddSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) return;
    setFeedback(null);

    if (!subNameEn.trim() || !subNameBn.trim()) {
      setFeedback({
        type: 'error',
        text: 'Provide both English and Bengali subcategory titles.',
      });
      return;
    }

    const cleanSlug = (subSlug.trim() || slugifyTitle(subNameEn, 'sub'))
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-');

    const newSub: Subcategory = {
      id: `${selectedCategory.id}-${cleanSlug}`,
      slug: cleanSlug,
      categorySlug: selectedCategory.slug,
      name: { en: subNameEn.trim(), bn: subNameBn.trim() },
      description: {
        en: subDescEn.trim() || `${subNameEn.trim()} guides and articles.`,
        bn: subDescBn.trim() || `${subNameBn.trim()} বিষয়ক নির্দেশিকা ও প্রবন্ধ।`,
      },
    };

    const nextSubs = [
      ...selectedCategory.subcategories.filter((s) => s.slug !== cleanSlug),
      newSub,
    ];

    setBusy(true);
    try {
      await saveCategoryInFirestore({
        actorUid,
        actorEmail,
        category: { ...selectedCategory, subcategories: nextSubs },
      });
      setSubNameEn('');
      setSubNameBn('');
      setSubSlug('');
      setSubDescEn('');
      setSubDescBn('');
      setFeedback({
        type: 'success',
        text: `Added subcategory "${newSub.name.en}" to ${selectedCategory.name.en}.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save subcategory.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveSubcategory = async (subSlugToRemove: string) => {
    if (!selectedCategory) return;
    setFeedback(null);
    setBusy(true);
    try {
      await saveCategoryInFirestore({
        actorUid,
        actorEmail,
        category: {
          ...selectedCategory,
          subcategories: selectedCategory.subcategories.filter(
            (s) => s.slug !== subSlugToRemove
          ),
        },
      });
      setFeedback({ type: 'success', text: `Removed subcategory "${subSlugToRemove}".` });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to remove subcategory.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    setFeedback(null);
    setBusy(true);
    try {
      await deleteCategoryInFirestore({ actorUid, actorEmail, categoryId });
      setConfirmDeleteCatId(null);
      setFeedback({ type: 'success', text: `Category "${categoryId}" deleted from Firestore.` });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to delete category.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {feedback && (
        <div
          role={feedback.type === 'error' ? 'alert' : 'status'}
          className={`rounded-xl px-4 py-3 text-xs font-medium border ${
            feedback.type === 'error'
              ? 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300'
              : 'border-[#22A06B]/40 bg-[#22A06B]/10 text-[#22A06B]'
          }`}
        >
          {feedback.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Category List */}
        <section className="lg:col-span-5 border border-black/10 dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-[#11192B] space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-editorial text-xl font-semibold text-[#101827] dark:text-[#F5F4EF]">
              Categories ({categories.length})
            </h2>
            <button
              type="button"
              onClick={() => setCreatingNew((prev) => !prev)}
              className="btn-transparent-black inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{creatingNew ? 'Cancel' : 'New Category'}</span>
            </button>
          </div>

          {creatingNew && (
            <form
              onSubmit={handleSaveNewCategory}
              className="border border-black/15 dark:border-white/15 rounded-xl p-4 bg-[#F5F4EF]/50 dark:bg-white/[0.03] space-y-3"
            >
              <input
                type="text"
                aria-label="New category English name"
                value={catNameEn}
                onChange={(e) => setCatNameEn(e.target.value)}
                placeholder="English name (e.g. Science & Space)"
                className="w-full min-h-[38px] px-3 py-1.5 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-xs"
              />
              <input
                type="text"
                aria-label="New category Bengali name"
                value={catNameBn}
                onChange={(e) => setCatNameBn(e.target.value)}
                placeholder="বাংলা নাম (যেমন: বিজ্ঞান ও মহাকাশ)"
                className="w-full min-h-[38px] px-3 py-1.5 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-xs font-bn"
              />
              <input
                type="text"
                aria-label="New category slug"
                value={catSlug}
                onChange={(e) => setCatSlug(e.target.value)}
                placeholder="slug-identifier (optional)"
                className="w-full min-h-[38px] px-3 py-1.5 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-xs font-mono-tabular"
              />
              <input
                type="text"
                aria-label="New category English description"
                value={catDescEn}
                onChange={(e) => setCatDescEn(e.target.value)}
                placeholder="English description..."
                className="w-full min-h-[38px] px-3 py-1.5 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-xs"
              />
              <input
                type="text"
                aria-label="New category Bengali description"
                value={catDescBn}
                onChange={(e) => setCatDescBn(e.target.value)}
                placeholder="বাংলা বর্ণনা..."
                className="w-full min-h-[38px] px-3 py-1.5 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-xs font-bn"
              />
              <button
                type="submit"
                disabled={busy}
                className="btn-transparent-black-solid w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Create Category</span>
              </button>
            </form>
          )}

          <div className="space-y-2.5">
            {categories.map((cat) => {
              const isSelected = selectedCategory?.id === cat.id;
              return (
                <div
                  key={cat.id}
                  className={`p-3.5 rounded-xl border transition-colors ${
                    isSelected
                      ? 'border-[#101827] dark:border-white bg-[#F5F4EF] dark:bg-white/[0.06]'
                      : 'border-black/10 dark:border-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className="text-left flex-1 cursor-pointer"
                    >
                      <div className="font-semibold text-sm text-[#101827] dark:text-[#F5F4EF]">
                        {cat.name.en}
                      </div>
                      <div className="font-bn text-xs text-black/65 dark:text-[#A5AAB4]">
                        {cat.name.bn}
                      </div>
                      <div className="text-[11px] font-mono-tabular text-black/50 dark:text-[#A5AAB4] mt-1">
                        /{cat.slug}/ · {cat.subcategories.length} subcategories
                      </div>
                    </button>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleCategoryActive(cat)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer ${
                          cat.isActive !== false
                            ? 'btn-transparent-black-solid'
                            : 'btn-transparent-black'
                        }`}
                      >
                        {cat.isActive !== false ? 'Active' : 'Hidden'}
                      </button>

                      {hasRoleAdminPermission && (
                        confirmDeleteCatId === cat.id ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="px-2 py-1 rounded-md text-[11px] font-semibold bg-red-600 text-white cursor-pointer"
                          >
                            Confirm
                          </button>
                        ) : (
                          <button
                            type="button"
                            aria-label={`Delete category ${cat.name.en}`}
                            onClick={() => setConfirmDeleteCatId(cat.id)}
                            className="btn-transparent-black p-1.5 rounded-md cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Subcategory & Tag Inspector */}
        <section className="lg:col-span-7 space-y-6">
          {selectedCategory && (
            <div className="border border-black/10 dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-[#11192B] space-y-5">
              <div>
                <h3 className="font-editorial text-xl font-semibold text-[#101827] dark:text-[#F5F4EF]">
                  Subcategories — {selectedCategory.name.en}
                </h3>
                <p className="text-xs text-black/60 dark:text-[#A5AAB4] mt-0.5">
                  Manage bilingual subcategories under /{selectedCategory.slug}/.
                </p>
              </div>

              <div className="divide-y divide-black/10 dark:divide-white/10">
                {selectedCategory.subcategories.map((sub) => (
                  <div
                    key={sub.slug}
                    className="py-3 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-sm font-semibold text-[#101827] dark:text-[#F5F4EF]">
                        {sub.name.en}{' '}
                        <span className="font-bn font-normal text-black/65 dark:text-[#A5AAB4]">
                          / {sub.name.bn}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono-tabular text-black/50 dark:text-[#A5AAB4]">
                        /{selectedCategory.slug}/{sub.slug}/
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove subcategory ${sub.name.en}`}
                      disabled={busy}
                      onClick={() => handleRemoveSubcategory(sub.slug)}
                      className="btn-transparent-black p-1.5 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>

              <form
                onSubmit={handleAddSubcategory}
                className="border-t border-black/10 dark:border-white/10 pt-4 space-y-3"
              >
                <div className="text-xs font-bold uppercase tracking-wider text-black/65 dark:text-[#A5AAB4]">
                  Add Subcategory
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <input
                    type="text"
                    aria-label="Subcategory English name"
                    value={subNameEn}
                    onChange={(e) => setSubNameEn(e.target.value)}
                    placeholder="English Name"
                    className="min-h-[38px] px-3 py-1.5 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-xs"
                  />
                  <input
                    type="text"
                    aria-label="Subcategory Bengali name"
                    value={subNameBn}
                    onChange={(e) => setSubNameBn(e.target.value)}
                    placeholder="বাংলা নাম"
                    className="min-h-[38px] px-3 py-1.5 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-xs font-bn"
                  />
                  <input
                    type="text"
                    aria-label="Subcategory slug"
                    value={subSlug}
                    onChange={(e) => setSubSlug(e.target.value)}
                    placeholder="slug (optional)"
                    className="min-h-[38px] px-3 py-1.5 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-xs font-mono-tabular"
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="btn-transparent-black-solid inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Add Subcategory to {selectedCategory.shortName.en}</span>
                </button>
              </form>
            </div>
          )}

          {/* Editorial Tag Index */}
          <div className="border border-black/10 dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-[#11192B] space-y-3">
            <h3 className="font-editorial text-lg font-semibold text-[#101827] dark:text-[#F5F4EF]">
              Tag Taxonomy Usage ({tagStats.length} unique tags)
            </h3>
            {tagStats.length === 0 ? (
              <p className="text-xs text-black/60 dark:text-[#A5AAB4]">
                No tags assigned to articles yet.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tagStats.map((t) => (
                  <div
                    key={t.tag}
                    className="px-2.5 py-1 rounded-md border border-black/15 dark:border-white/15 bg-[#F5F4EF]/60 dark:bg-white/[0.04] text-xs"
                  >
                    <span className="font-medium">{t.tag}</span>{' '}
                    <span className="font-mono-tabular text-black/55 dark:text-[#A5AAB4]">
                      ({t.count})
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
