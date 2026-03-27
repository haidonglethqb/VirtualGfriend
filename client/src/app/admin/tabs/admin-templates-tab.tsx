'use client';

import { AnimatePresence } from 'framer-motion';
import { Plus, RefreshCw, Edit2, Trash2, Zap } from 'lucide-react';
import { Modal } from '../components/admin-modal';
import type { Template } from '../admin-types';

interface TemplatesTabProps {
  templates: Template[];
  language: 'vi' | 'en';
  fetchTemplates: () => void;
  handleToggleTemplate: (id: string) => void;
  handleCreateTemplate: () => void;
  handleUpdateTemplate: () => void;
  handleDeleteTemplate: (id: string) => void;
  formData: Record<string, unknown>;
  setFormData: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
  showModal: string | null;
  setShowModal: React.Dispatch<React.SetStateAction<string | null>>;
  selectedTemplate: Template | null;
  setSelectedTemplate: React.Dispatch<React.SetStateAction<Template | null>>;
  createTemplateFormData: (template?: Template) => Record<string, unknown>;
  actionLoading: boolean;
}

function TemplateFormFields({
  formData,
  setFormData,
  tr,
}: {
  formData: Record<string, unknown>;
  setFormData: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
  tr: (vi: string, en: string) => string;
}) {
  return (
    <div className="space-y-4 max-h-96 overflow-y-auto">
      <div>
        <label className="block text-sm text-gray-400 mb-2">{tr('Tên mẫu', 'Name')} *</label>
        <input
          type="text"
          value={(formData.name as string) || ''}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
        />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-2">{tr('Mô tả', 'Description')} *</label>
        <textarea
          value={(formData.description as string) || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
          rows={3}
        />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-2">Avatar URL *</label>
        <input
          type="url"
          value={(formData.avatarUrl as string) || ''}
          onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
          className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
          placeholder="https://..."
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">{tr('Giới tính', 'Gender')}</label>
          <select
            value={(formData.gender as string) || 'FEMALE'}
            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
            className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
          >
            <option value="FEMALE">FEMALE</option>
            <option value="MALE">MALE</option>
            <option value="NON_BINARY">NON_BINARY</option>
            <option value="OTHER">OTHER</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-2">{tr('Tính cách', 'Personality')}</label>
          <input
            type="text"
            value={(formData.personality as string) || ''}
            onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
            className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">Style</label>
          <input
            type="text"
            value={(formData.style as string) || 'anime'}
            onChange={(e) => setFormData({ ...formData, style: e.target.value })}
            className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-2">{tr('Thứ tự', 'Sort order')}</label>
          <input
            type="number"
            value={(formData.sortOrder as number) || 0}
            onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
            className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={Boolean(formData.isActive ?? true)}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            className="w-4 h-4"
          />
          {tr('Đang hoạt động', 'Active')}
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={Boolean(formData.isDefault)}
            onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
            className="w-4 h-4"
          />
          {tr('Mặc định', 'Default')}
        </label>
      </div>
    </div>
  );
}

export function TemplatesTab({
  templates, language, fetchTemplates, handleToggleTemplate,
  handleCreateTemplate, handleUpdateTemplate, handleDeleteTemplate,
  formData, setFormData, showModal, setShowModal,
  selectedTemplate, setSelectedTemplate, createTemplateFormData, actionLoading,
}: TemplatesTabProps) {
  const tr = (vi: string, en: string) => (language === 'vi' ? vi : en);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{tr('Mẫu nhân vật', 'Character Templates')}</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedTemplate(null);
              setFormData({ ...createTemplateFormData() });
              setShowModal('createTemplate');
            }}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> {tr('Thêm mẫu', 'Add Template')}
          </button>
          <button onClick={fetchTemplates} className="p-2 bg-gray-700/50 rounded-lg hover:bg-gray-700">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <div key={template.id} className="bg-gray-800/50 rounded-2xl border border-gray-700/50 overflow-hidden">
            {template.avatarUrl && (
              <div className="h-48 bg-gray-700">
                <img src={template.avatarUrl} alt={template.name} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{template.name}</h3>
                <span className={`px-2 py-1 rounded text-xs ${template.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {template.isActive ? tr('Đang hoạt động', 'Active') : tr('Không hoạt động', 'Inactive')}
                </span>
              </div>
              <p className="text-sm text-gray-400 mb-3">{template.description}</p>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>{template.gender} • {template.personality} • #{template.sortOrder}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedTemplate(template);
                      setFormData({ ...createTemplateFormData(template) });
                      setShowModal('editTemplate');
                    }}
                    className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30"
                    title={tr('Sửa', 'Edit')}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
                    title={tr('Xóa', 'Delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleToggleTemplate(template.id)}
                    className="p-2 bg-gray-600/50 rounded-lg hover:bg-gray-600"
                    title={tr('Bật/tắt', 'Toggle')}
                  >
                    <Zap className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {showModal === 'createTemplate' && (
          <Modal title={tr('Thêm mẫu nhân vật', 'Create Template')} onClose={() => setShowModal(null)}>
            <TemplateFormFields formData={formData} setFormData={setFormData} tr={tr} />
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(null)} className="flex-1 py-3 bg-gray-700 text-gray-300 rounded-xl hover:bg-gray-600">
                {tr('Hủy', 'Cancel')}
              </button>
              <button
                onClick={handleCreateTemplate}
                disabled={actionLoading}
                className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50"
              >
                {actionLoading ? tr('Đang tạo...', 'Creating...') : tr('Tạo mẫu', 'Create Template')}
              </button>
            </div>
          </Modal>
        )}

        {showModal === 'editTemplate' && selectedTemplate && (
          <Modal title={tr('Sửa mẫu nhân vật', 'Edit Template')} onClose={() => setShowModal(null)}>
            <TemplateFormFields formData={formData} setFormData={setFormData} tr={tr} />
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(null)} className="flex-1 py-3 bg-gray-700 text-gray-300 rounded-xl hover:bg-gray-600">
                {tr('Hủy', 'Cancel')}
              </button>
              <button
                onClick={handleUpdateTemplate}
                disabled={actionLoading}
                className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50"
              >
                {actionLoading ? tr('Đang lưu...', 'Saving...') : tr('Lưu thay đổi', 'Save Changes')}
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </>
  );
}
