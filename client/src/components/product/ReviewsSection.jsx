import { useState } from "react";
import { Star, CheckCircle, ThumbsUp, MessageSquarePlus, X } from "lucide-react";
export const ReviewsSection = ({
  reviews,
  rating,
  reviewCount,
  onAddReview
}) => {
  const [filterRating, setFilterRating] = useState(null);
  const [writeModalOpen, setWriteModalOpen] = useState(false);
  const [newAuthor, setNewAuthor] = useState("");
  const [newRating, setNewRating] = useState(5);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const filtered = filterRating ? reviews.filter((r) => r.rating === filterRating) : reviews;
  const handleSubmitReview = (e) => {
    e.preventDefault();
    if (!newAuthor || !newTitle || !newContent) return;
    const newRev = {
      id: `rev-${Date.now()}`,
      author: newAuthor,
      verified: true,
      rating: newRating,
      date: "Just now",
      title: newTitle,
      content: newContent,
      colorway: "Shadow Navy / Army Green",
      sizeBought: "42",
      fitFeedback: "True to Size",
      helpfulCount: 0
    };
    onAddReview(newRev);
    setWriteModalOpen(false);
    setNewAuthor("");
    setNewTitle("");
    setNewContent("");
  };
  return <section className="my-12 bg-white rounded-3xl p-6 sm:p-10 border border-neutral-200/80 shadow-xs space-y-8">
      
      {
    /* Header */
  }
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-neutral-100 pb-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-black uppercase text-neutral-900 tracking-tight">
            Customer Reviews ({reviewCount})
          </h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center text-amber-400">
              {[1, 2, 3, 4, 5].map((s) => <Star
    key={s}
    className={`w-5 h-5 ${s <= Math.floor(rating) ? "fill-amber-400 text-amber-400" : "text-neutral-300"}`}
  />)}
            </div>
            <span className="font-extrabold text-lg text-neutral-900">{rating.toFixed(1)} out of 5</span>
            <span className="text-xs text-neutral-500 font-medium">(100% Verified Runners)</span>
          </div>
        </div>

        <button
    onClick={() => setWriteModalOpen(true)}
    className="bg-[#232321] hover:bg-black text-white font-extrabold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer shrink-0"
  >
          <MessageSquarePlus className="w-4 h-4" />
          <span>Write a Review</span>
        </button>
      </div>

      {
    /* Ratings Distribution & Filters */
  }
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-neutral-50 p-6 rounded-2xl border border-neutral-200/60">
        <div className="md:col-span-5 space-y-2">
          <p className="text-xs font-bold text-neutral-700 uppercase tracking-wider">Rating Breakdown</p>
          {[5, 4, 3, 2, 1].map((stars) => {
    return <button
      key={stars}
      onClick={() => setFilterRating(filterRating === stars ? null : stars)}
      className={`w-full flex items-center gap-3 text-xs font-bold transition-all p-1 rounded-lg ${filterRating === stars ? "bg-blue-100/80 text-blue-900" : "hover:bg-neutral-200/50 text-neutral-700"}`}
    >
                <span className="w-12 text-right flex items-center justify-end gap-1">
                  {stars} <Star className="w-3 h-3 fill-amber-400 text-amber-400 inline" />
                </span>
                <div className="flex-1 bg-neutral-200 h-2.5 rounded-full overflow-hidden">
                  <div
      className="bg-[#232321] h-full rounded-full transition-all duration-300"
      style={{ width: `${stars === 5 ? 85 : stars === 4 ? 15 : 0}%` }}
    />
                </div>
                <span className="w-10 text-left text-neutral-500">{stars === 5 ? "85%" : stars === 4 ? "15%" : "0%"}</span>
              </button>;
  })}
        </div>

        <div className="md:col-span-7 flex flex-col justify-center space-y-3 md:border-l md:border-neutral-200 md:pl-8">
          <p className="text-xs font-bold text-neutral-700 uppercase tracking-wider">Fit Feedback Summary</p>
          <div className="grid grid-cols-3 gap-3 text-center text-xs font-semibold">
            <div className="p-3 bg-white rounded-xl border border-neutral-200">
              <span className="block text-neutral-400 text-[10px] uppercase">Runs Small</span>
              <span className="text-neutral-900 font-extrabold">2%</span>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900">
              <span className="block text-blue-600 text-[10px] uppercase">True to Size</span>
              <span className="font-extrabold text-sm">95%</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-neutral-200">
              <span className="block text-neutral-400 text-[10px] uppercase">Runs Large</span>
              <span className="text-neutral-900 font-extrabold">3%</span>
            </div>
          </div>
        </div>
      </div>

      {
    /* Reviews List */
  }
      <div className="space-y-4">
        {filtered.map((rev) => <div
    key={rev.id}
    className="p-5 bg-[#EAEAE8]/40 rounded-2xl border border-neutral-200/70 space-y-3"
  >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm text-neutral-900">{rev.author}</span>
                {rev.verified && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    <CheckCircle className="w-3 h-3" /> Verified Buyer
                  </span>}
              </div>
              <span className="text-xs text-neutral-400 font-medium">{rev.date}</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center text-amber-400">
                {[1, 2, 3, 4, 5].map((s) => <Star
    key={s}
    className={`w-4 h-4 ${s <= rev.rating ? "fill-amber-400 text-amber-400" : "text-neutral-300"}`}
  />)}
              </div>
              <span className="text-xs text-neutral-500 font-semibold">
                Color: {rev.colorway} • Size: EU {rev.sizeBought}
              </span>
            </div>

            <h4 className="font-extrabold text-sm text-neutral-900">{rev.title}</h4>
            <p className="text-xs text-neutral-700 leading-relaxed font-normal">{rev.content}</p>

            <div className="pt-2 flex items-center justify-between text-[11px] text-neutral-500 font-medium">
              <span>Fit: <strong className="text-neutral-800">{rev.fitFeedback}</strong></span>
              <button className="flex items-center gap-1 hover:text-neutral-900 transition-colors cursor-pointer">
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>Helpful ({rev.helpfulCount})</span>
              </button>
            </div>
          </div>)}
      </div>

      {
    /* Write Review Modal */
  }
      {writeModalOpen && <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 relative">
            <button
    onClick={() => setWriteModalOpen(false)}
    className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-800 rounded-full"
  >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-extrabold text-lg uppercase text-neutral-900 mb-4">Write a Verified Review</h3>

            <form onSubmit={handleSubmitReview} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-neutral-700 font-bold mb-1">Your Name</label>
                <input
    type="text"
    required
    value={newAuthor}
    onChange={(e) => setNewAuthor(e.target.value)}
    placeholder="e.g. Alex Johnson"
    className="w-full bg-neutral-100 border border-neutral-200 rounded-xl p-3 text-neutral-900 focus:outline-none focus:ring-1 focus:ring-black"
  />
              </div>

              <div>
                <label className="block text-neutral-700 font-bold mb-1">Rating</label>
                <div className="flex gap-2 text-amber-400">
                  {[1, 2, 3, 4, 5].map((s) => <button
    key={s}
    type="button"
    onClick={() => setNewRating(s)}
    className="cursor-pointer"
  >
                      <Star className={`w-6 h-6 ${s <= newRating ? "fill-amber-400 text-amber-400" : "text-neutral-300"}`} />
                    </button>)}
                </div>
              </div>

              <div>
                <label className="block text-neutral-700 font-bold mb-1">Review Headline</label>
                <input
    type="text"
    required
    value={newTitle}
    onChange={(e) => setNewTitle(e.target.value)}
    placeholder="Summarize your experience..."
    className="w-full bg-neutral-100 border border-neutral-200 rounded-xl p-3 text-neutral-900 focus:outline-none focus:ring-1 focus:ring-black"
  />
              </div>

              <div>
                <label className="block text-neutral-700 font-bold mb-1">Review Details</label>
                <textarea
    required
    rows={3}
    value={newContent}
    onChange={(e) => setNewContent(e.target.value)}
    placeholder="How did the fit, 4D midsole cushioning, and comfort perform?"
    className="w-full bg-neutral-100 border border-neutral-200 rounded-xl p-3 text-neutral-900 focus:outline-none focus:ring-1 focus:ring-black"
  />
              </div>

              <button
    type="submit"
    className="w-full bg-[#232321] text-white font-extrabold uppercase py-3.5 rounded-xl hover:bg-black transition-colors cursor-pointer"
  >
                Submit Review
              </button>
            </form>
          </div>
        </div>}

    </section>;
};
