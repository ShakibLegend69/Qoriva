import { useState } from 'react';
import { Check, Edit3, Trash2, Upload } from 'lucide-react';
import type { Article } from '../../types/qorvia';
import { countMediaUsageInArticles } from '../../lib/editorialValidation';
import {
  type MediaAssetRecord,
  deleteMediaAsset,
  updateMediaMetadataInFirestore,
  uploadMediaAsset,
} from '../../lib/firestoreService';

interface MediaLibraryTabProps {
  actorUid: string;
  actorEmail?: string | null;
  mediaAssets: MediaAssetRecord[];
  articles: Article[];
}

export function MediaLibraryTab({
  actorUid,
  actorEmail,
  mediaAssets,
  articles,
}: MediaLibraryTabProps) {
  const [mediaAlt, setMediaAlt] = useState('');
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaStatus, setMediaStatus] = useState<{
    type: 'error' | 'success';
    text: string;
  } | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAlt, setEditAlt] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleUploadMedia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMedia(true);
    setMediaStatus(null);
    try {
      const uploaded = await uploadMediaAsset({
        actorUid,
        actorEmail,
        file,
        alt: mediaAlt || file.name,
      });
      setMediaAlt('');
      setMediaStatus({
        type: 'success',
        text: `Uploaded ${uploaded.title} to Firebase Storage.`,
      });
    } catch (err) {
      setMediaStatus({
        type: 'error',
        text: err instanceof Error ? err.message : 'Upload failed.',
      });
    } finally {
      setUploadingMedia(false);
      e.target.value = '';
    }
  };

  const startEdit = (item: MediaAssetRecord) => {
    setEditingId(item.mediaId);
    setEditAlt(item.alt);
    setEditTitle(item.title || '');
  };

  const handleSaveMeta = async (mediaId: string) => {
    setMediaStatus(null);
    try {
      await updateMediaMetadataInFirestore({
        actorUid,
        actorEmail,
        mediaId,
        alt: editAlt,
        title: editTitle,
      });
      setEditingId(null);
      setMediaStatus({ type: 'success', text: 'Updated media alt text and title.' });
    } catch (err) {
      setMediaStatus({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update media metadata.',
      });
    }
  };

  const handleDelete = async (item: MediaAssetRecord) => {
    setMediaStatus(null);
    try {
      await deleteMediaAsset({ actorUid, actorEmail, asset: item });
      setConfirmDeleteId(null);
      setMediaStatus({ type: 'success', text: `Deleted ${item.title || item.mediaId} from Storage & Firestore.` });
    } catch (err) {
      setMediaStatus({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to delete media asset.',
      });
    }
  };

  return (
    <section className="border border-black/10 dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-[#11192B] space-y-6">
      <div>
        <h2 className="font-editorial text-xl font-semibold text-[#101827] dark:text-[#F5F4EF]">
          Firebase Storage Media Library ({mediaAssets.length})
        </h2>
        <p className="text-xs text-black/60 dark:text-[#A5AAB4] mt-1">
          Upload images (max 5 MB), edit accessibility alt metadata, and safely remove unused assets.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
        <div className="flex-1">
          <label htmlFor="media-alt-input" className="block text-xs font-semibold mb-1.5">
            Descriptive Alt Text (Accessibility & SEO)
          </label>
          <input
            id="media-alt-input"
            type="text"
            value={mediaAlt}
            onChange={(e) => setMediaAlt(e.target.value)}
            placeholder="Describe the image for screen readers..."
            className="w-full min-h-[40px] px-3 py-2 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-sm"
          />
        </div>
        <label className="btn-transparent-black-solid inline-flex items-center justify-center gap-2 min-h-[40px] px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap">
          <Upload className="w-4 h-4" aria-hidden="true" />
          <span>{uploadingMedia ? 'Uploading...' : 'Upload Image'}</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
            onChange={handleUploadMedia}
            disabled={uploadingMedia}
            className="sr-only"
          />
        </label>
      </div>

      {mediaStatus && (
        <p
          role={mediaStatus.type === 'error' ? 'alert' : 'status'}
          className={`text-xs font-medium ${
            mediaStatus.type === 'error'
              ? 'text-red-700 dark:text-red-400'
              : 'text-[#22A06B]'
          }`}
        >
          {mediaStatus.text}
        </p>
      )}

      {mediaAssets.length === 0 ? (
        <p className="text-sm text-black/55 dark:text-[#A5AAB4] py-8 text-center border border-dashed border-black/15 dark:border-white/15 rounded-xl">
          No uploaded Storage images yet. Upload an editorial photograph above to use it across EN/BN articles.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mediaAssets.map((item) => {
            const usageCount = countMediaUsageInArticles(item.url, articles);
            const isEditing = editingId === item.mediaId;

            return (
              <div
                key={item.mediaId}
                className="border border-black/10 dark:border-white/10 rounded-xl overflow-hidden bg-[#F5F4EF]/50 dark:bg-white/[0.02] flex flex-col"
              >
                <img
                  src={item.url}
                  alt={item.alt}
                  className="w-full h-40 object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between text-xs">
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        aria-label={`Title for ${item.mediaId}`}
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Title"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-xs"
                      />
                      <input
                        type="text"
                        aria-label={`Alt text for ${item.mediaId}`}
                        value={editAlt}
                        onChange={(e) => setEditAlt(e.target.value)}
                        placeholder="Alt text"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#0B111E] border border-black/15 dark:border-white/15 text-xs"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveMeta(item.mediaId)}
                          className="btn-transparent-black-solid inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Save</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="btn-transparent-black px-2.5 py-1 rounded-md text-xs cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <div className="font-semibold text-[#101827] dark:text-[#F5F4EF] truncate">
                          {item.title || item.alt}
                        </div>
                        <div className="text-black/65 dark:text-[#A5AAB4] mt-0.5 line-clamp-2">
                          Alt: {item.alt}
                        </div>
                        <div className="text-[11px] font-mono-tabular text-black/50 dark:text-[#A5AAB4] mt-1">
                          {usageCount === 0
                            ? 'Unused in articles'
                            : `Used in ${usageCount} article(s)`}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-black/10 dark:border-white/10">
                        <button
                          type="button"
                          aria-label={`Edit metadata for ${item.title || item.mediaId}`}
                          onClick={() => startEdit(item)}
                          className="btn-transparent-black inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" aria-hidden="true" />
                          <span>Edit Alt</span>
                        </button>

                        {usageCount === 0 && (
                          confirmDeleteId === item.mediaId ? (
                            <button
                              type="button"
                              onClick={() => handleDelete(item)}
                              className="px-2.5 py-1 rounded-md text-xs font-semibold bg-red-600 text-white cursor-pointer"
                            >
                              Confirm Delete
                            </button>
                          ) : (
                            <button
                              type="button"
                              aria-label={`Delete unused media ${item.title || item.mediaId}`}
                              onClick={() => setConfirmDeleteId(item.mediaId)}
                              className="btn-transparent-black inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" aria-hidden="true" />
                              <span>Delete</span>
                            </button>
                          )
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
