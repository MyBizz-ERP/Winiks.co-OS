import { supabaseAdmin } from '@/utils/supabase/admin'
import { updateCategory, deleteCategory } from '../actions'
import Link from 'next/link'

// Next.js 16: params is async
export default async function CategoryManagementPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    const { data: cat } = await supabaseAdmin.from('categories').select('*').eq('id', id).single()

    if (!cat) return <div className="p-10 font-bold text-red-500">Category Error.</div>

    return (
        <div className="p-10 max-w-4xl mx-auto w-full animate-in fade-in duration-500">

            <div className="mb-6 flex items-center space-x-4">
                <Link href="/admin/categories" className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-bold hover:bg-slate-300 transition">
                    ← Back to List
                </Link>
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Manage Framework</h1>
                    <p className="text-slate-500 mt-1 font-medium">Editing: {cat.display_name}</p>
                </div>
            </div>

            <div className="max-w-lg mt-10">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                    <h2 className="text-xs font-extrabold text-slate-800 mb-6 uppercase tracking-widest border-b border-slate-100 pb-3">Update Identity</h2>

                    <form action={updateCategory} className="space-y-4">
                        <input type="hidden" name="id" value={cat.id} />

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Display Name</label>
                            <input type="text" name="display_name" defaultValue={cat.display_name} required className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition" />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Internal Slug</label>
                            <input type="text" name="name" defaultValue={cat.name} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition font-mono" />
                            <p className="text-[10px] uppercase text-amber-500 font-bold mt-1.5">⚠ Changing the slug affects login routing!</p>
                        </div>

                        <button type="submit" className="w-full bg-slate-900 text-white font-bold py-3 mt-4 rounded-lg hover:bg-slate-800 transition tracking-wider">
                            SAVE CATEGORY
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-red-100">
                        <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest mb-3">Danger Zone</p>
                        <form action={deleteCategory}>
                            <input type="hidden" name="id" value={cat.id} />
                            <button type="submit" className="w-full bg-red-50 text-red-600 font-bold py-3 rounded-lg border border-red-200 hover:bg-red-100 transition shadow-sm tracking-wider">
                                🧨 DETONATE CATEGORY
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}
