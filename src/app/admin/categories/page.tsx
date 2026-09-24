import { supabaseAdmin } from '@/utils/supabase/admin'
import { createCategory } from './actions'
import Link from 'next/link'

export default async function CategoriesPage() {
    const { data: categories } = await supabaseAdmin.from('categories').select('*').order('created_at', { ascending: false })

    return (
        <div className="p-10 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
            <div className="flex justify-between items-end mb-10">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">ERP Categories</h1>
                    <p className="text-slate-500 mt-2 text-lg">Define and monitor the global software modules available on the platform.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                {/* ADD CATEGORY FORM */}
                <div className="md:col-span-1">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h2 className="text-lg font-bold text-slate-800 mb-4">Add New Category</h2>
                        <form action={createCategory} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Internal Target Name</label>
                                <input type="text" name="name" required placeholder="e.g., pharmacy" className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Display Name</label>
                                <input type="text" name="display_name" required placeholder="e.g., Pharmacy & Medical ERP" className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition" />
                            </div>
                            <button type="submit" className="w-full bg-slate-900 text-white font-semibold py-3 rounded-lg hover:bg-slate-800 transition-colors shadow-sm">
                                Create Category
                            </button>
                        </form>
                    </div>
                </div>

                {/* CATEGORIES TABLE */}
                <div className="md:col-span-2">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Display Name</th>
                                    <th className="px-6 py-4">Internal Target</th>
                                    <th className="px-6 py-4">System Health</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {categories?.map((cat) => (
                                    <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-5 font-bold text-slate-800">{cat.display_name}</td>
                                        <td className="px-6 py-5">
                                            <span className="bg-slate-100 border border-slate-200 text-slate-600 px-2.5 py-1 rounded-md text-xs font-mono font-medium">
                                                {cat.name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="inline-flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 shadow-sm">
                                                Operational
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-right pt-6">
                                            <Link href={`/admin/categories/${cat.id}`} className="inline-block bg-slate-900 border border-slate-700 text-white hover:bg-slate-700 font-bold text-xs px-4 py-2 mt-2 rounded-lg transition shadow-sm hover:-translate-y-0.5">
                                                Manage ➔
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                                {(!categories || categories.length === 0) && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-medium">No categories found in Master database.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    )
}
