import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Modal, Form, Input, Upload, Space, Typography,
  Tooltip, Popconfirm, Tag, App
} from 'antd';
import {
  UploadOutlined, HistoryOutlined, DownloadOutlined, DeleteOutlined,
  PlusOutlined, FileOutlined
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { documentService } from '../services/api';
import { useProject } from '../contexts/ProjectContext';

const { Text } = Typography;

interface DocumentVersion {
  id: number;
  versionNumber: number;
  filename: string;
  fileSize: number | null;
  mimeType: string | null;
  changeComment: string | null;
  createdAt: string;
  uploader?: { id: number; username: string } | null;
}

interface DocumentRecord {
  id: number;
  name: string;
  description: string | null;
  projectId: number;
  createdAt: string;
  updatedAt: string;
  latestVersion: DocumentVersion | null;
  versions?: DocumentVersion[];
}

const formatFileSize = (bytes: number | null): string => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
};

const triggerDownload = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

const DocumentManagerContent: React.FC = () => {
  const { message } = App.useApp();
  const { currentProjectId } = useProject();

  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Модалка создания документа
  const [createVisible, setCreateVisible] = useState(false);
  const [createForm] = Form.useForm();
  const [createFileList, setCreateFileList] = useState<UploadFile[]>([]);
  const [createLoading, setCreateLoading] = useState(false);

  // Модалка загрузки новой версии
  const [uploadVisible, setUploadVisible] = useState(false);
  const [uploadTargetDoc, setUploadTargetDoc] = useState<DocumentRecord | null>(null);
  const [uploadForm] = Form.useForm();
  const [uploadFileList, setUploadFileList] = useState<UploadFile[]>([]);
  const [uploadLoading, setUploadLoading] = useState(false);

  // Модалка истории версий
  const [versionsVisible, setVersionsVisible] = useState(false);
  const [versionsDoc, setVersionsDoc] = useState<DocumentRecord | null>(null);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);

  const loadDocuments = useCallback(async () => {
    if (!currentProjectId) return;
    setLoading(true);
    try {
      const data = await documentService.listDocuments(currentProjectId);
      setDocuments(data);
    } catch {
      message.error('Не удалось загрузить документы');
    } finally {
      setLoading(false);
    }
  }, [currentProjectId, message]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // --- Создание ---
  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      if (!createFileList[0]?.originFileObj) {
        message.error('Выберите файл');
        return;
      }
      setCreateLoading(true);
      const formData = new FormData();
      formData.append('name', values.name);
      if (values.description) formData.append('description', values.description);
      if (values.changeComment) formData.append('changeComment', values.changeComment);
      formData.append('projectId', String(currentProjectId));
      formData.append('file', createFileList[0].originFileObj as File);
      await documentService.createDocument(formData);
      message.success('Документ загружен');
      setCreateVisible(false);
      createForm.resetFields();
      setCreateFileList([]);
      loadDocuments();
    } catch (err: any) {
      if (err?.errorFields) return; // form validation
      message.error('Ошибка при создании документа');
    } finally {
      setCreateLoading(false);
    }
  };

  // --- Загрузка версии ---
  const openUploadVersion = (doc: DocumentRecord) => {
    setUploadTargetDoc(doc);
    setUploadVisible(true);
    setUploadFileList([]);
    uploadForm.resetFields();
  };

  const handleUploadVersion = async () => {
    if (!uploadTargetDoc) return;
    try {
      const values = await uploadForm.validateFields();
      if (!uploadFileList[0]?.originFileObj) {
        message.error('Выберите файл');
        return;
      }
      setUploadLoading(true);
      const formData = new FormData();
      if (values.changeComment) formData.append('changeComment', values.changeComment);
      formData.append('file', uploadFileList[0].originFileObj as File);
      await documentService.uploadVersion(uploadTargetDoc.id, formData);
      message.success('Новая версия загружена');
      setUploadVisible(false);
      setUploadTargetDoc(null);
      loadDocuments();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error('Ошибка при загрузке версии');
    } finally {
      setUploadLoading(false);
    }
  };

  // --- История версий ---
  const openVersions = async (doc: DocumentRecord) => {
    setVersionsDoc(doc);
    setVersionsVisible(true);
    setVersionsLoading(true);
    try {
      const data = await documentService.listVersions(doc.id);
      setVersions(data);
    } catch {
      message.error('Не удалось загрузить историю версий');
    } finally {
      setVersionsLoading(false);
    }
  };

  // --- Скачивание ---
  const handleDownload = async (doc: DocumentRecord, version: DocumentVersion) => {
    try {
      const blob = await documentService.downloadVersion(doc.id, version.id);
      triggerDownload(blob, version.filename);
    } catch {
      message.error('Ошибка при скачивании файла');
    }
  };

  // --- Удаление ---
  const handleDelete = async (docId: number) => {
    try {
      await documentService.deleteDocument(docId);
      message.success('Документ удалён');
      loadDocuments();
    } catch {
      message.error('Ошибка при удалении документа');
    }
  };

  const columns = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: DocumentRecord) => (
        <Space>
          <FileOutlined />
          <span>{name}</span>
          {record.description && (
            <Text type="secondary" style={{ fontSize: 12 }}>{record.description}</Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Версия',
      key: 'version',
      width: 90,
      render: (_: unknown, record: DocumentRecord) =>
        record.latestVersion ? (
          <Tag color="blue">v{record.latestVersion.versionNumber}</Tag>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: 'Файл',
      key: 'filename',
      render: (_: unknown, record: DocumentRecord) =>
        record.latestVersion ? (
          <Space direction="vertical" size={0}>
            <Text>{record.latestVersion.filename}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {formatFileSize(record.latestVersion.fileSize)}
            </Text>
          </Space>
        ) : '—',
    },
    {
      title: 'Последнее обновление',
      key: 'updatedAt',
      width: 170,
      render: (_: unknown, record: DocumentRecord) =>
        new Date(record.updatedAt).toLocaleString('ru-RU'),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 200,
      render: (_: unknown, record: DocumentRecord) => (
        <Space>
          {record.latestVersion && (
            <Tooltip title="Скачать актуальную версию">
              <Button
                icon={<DownloadOutlined />}
                size="small"
                onClick={() => handleDownload(record, record.latestVersion!)}
              />
            </Tooltip>
          )}
          <Tooltip title="История версий">
            <Button
              icon={<HistoryOutlined />}
              size="small"
              onClick={() => openVersions(record)}
            />
          </Tooltip>
          <Tooltip title="Загрузить новую версию">
            <Button
              icon={<UploadOutlined />}
              size="small"
              onClick={() => openUploadVersion(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Удалить документ и все его версии?"
            onConfirm={() => handleDelete(record.id)}
            okText="Удалить"
            cancelText="Отмена"
          >
            <Tooltip title="Удалить">
              <Button icon={<DeleteOutlined />} size="small" danger />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const versionColumns = [
    {
      title: 'Версия',
      dataIndex: 'versionNumber',
      key: 'versionNumber',
      width: 80,
      render: (v: number) => <Tag color="blue">v{v}</Tag>,
    },
    {
      title: 'Файл',
      dataIndex: 'filename',
      key: 'filename',
    },
    {
      title: 'Размер',
      dataIndex: 'fileSize',
      key: 'fileSize',
      width: 100,
      render: formatFileSize,
    },
    {
      title: 'Комментарий',
      dataIndex: 'changeComment',
      key: 'changeComment',
      render: (v: string | null) => v || <Text type="secondary">—</Text>,
    },
    {
      title: 'Загрузил',
      key: 'uploader',
      width: 120,
      render: (_: unknown, record: DocumentVersion) =>
        record.uploader?.username || <Text type="secondary">—</Text>,
    },
    {
      title: 'Дата',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (v: string) => new Date(v).toLocaleString('ru-RU'),
    },
    {
      title: '',
      key: 'download',
      width: 50,
      render: (_: unknown, record: DocumentVersion) =>
        versionsDoc ? (
          <Tooltip title="Скачать">
            <Button
              icon={<DownloadOutlined />}
              size="small"
              onClick={() => handleDownload(versionsDoc, record)}
            />
          </Tooltip>
        ) : null,
    },
  ];

  return (
    <div style={{ padding: 16 }}>
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Документы проекта</Typography.Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => { setCreateVisible(true); createForm.resetFields(); setCreateFileList([]); }}
          disabled={!currentProjectId}
        >
          Загрузить документ
        </Button>
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={documents}
        loading={loading}
        pagination={{ pageSize: 20 }}
        locale={{ emptyText: 'Нет документов' }}
      />

      {/* Модалка создания */}
      <Modal
        title="Загрузить документ"
        open={createVisible}
        onOk={handleCreate}
        onCancel={() => setCreateVisible(false)}
        confirmLoading={createLoading}
        okText="Загрузить"
        cancelText="Отмена"
      >
        <Form form={createForm} layout="vertical">
          <Form.Item name="name" label="Название" rules={[{ required: true, message: 'Введите название' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Описание">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="changeComment" label="Комментарий к версии v1">
            <Input />
          </Form.Item>
          <Form.Item label="Файл" required>
            <Upload
              beforeUpload={() => false}
              fileList={createFileList}
              onChange={({ fileList }) => setCreateFileList(fileList.slice(-1))}
              maxCount={1}
            >
              <Button icon={<UploadOutlined />}>Выбрать файл</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      {/* Модалка загрузки версии */}
      <Modal
        title={`Новая версия: ${uploadTargetDoc?.name}`}
        open={uploadVisible}
        onOk={handleUploadVersion}
        onCancel={() => setUploadVisible(false)}
        confirmLoading={uploadLoading}
        okText="Загрузить"
        cancelText="Отмена"
      >
        <Form form={uploadForm} layout="vertical">
          <Form.Item name="changeComment" label="Комментарий к изменениям">
            <Input placeholder="Что изменилось в этой версии?" />
          </Form.Item>
          <Form.Item label="Файл" required>
            <Upload
              beforeUpload={() => false}
              fileList={uploadFileList}
              onChange={({ fileList }) => setUploadFileList(fileList.slice(-1))}
              maxCount={1}
            >
              <Button icon={<UploadOutlined />}>Выбрать файл</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      {/* Модалка истории версий */}
      <Modal
        title={`История версий: ${versionsDoc?.name}`}
        open={versionsVisible}
        onCancel={() => setVersionsVisible(false)}
        footer={null}
        width={800}
      >
        <Table
          rowKey="id"
          columns={versionColumns}
          dataSource={versions}
          loading={versionsLoading}
          pagination={false}
          size="small"
        />
      </Modal>
    </div>
  );
};

const DocumentManager: React.FC = () => (
  <App>
    <DocumentManagerContent />
  </App>
);

export default DocumentManager;
