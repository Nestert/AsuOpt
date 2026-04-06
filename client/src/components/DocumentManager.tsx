import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Table, Button, Modal, Form, Input, Upload, Space, Typography,
  Tooltip, Popconfirm, Tag, App, Alert, Spin
} from 'antd';
import {
  UploadOutlined, HistoryOutlined, DownloadOutlined, DeleteOutlined,
  PlusOutlined, FileOutlined, DiffOutlined, ReloadOutlined, WarningOutlined
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
  comparisonId?: number | null;
  comparisonStatus?: string | null;
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

interface ComparisonReport {
  id: number;
  status: 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED';
  reportText: string | null;
  reportJson: any;
  warnings: string[] | null;
  baseVersion: { id: number; versionNumber: number; filename: string } | null;
  targetVersion: { id: number; versionNumber: number; filename: string } | null;
  startedAt: string | null;
  finishedAt: string | null;
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

const comparisonStatusTag = (status: string | null | undefined) => {
  if (!status) return null;
  const map: Record<string, { color: string; label: string }> = {
    PENDING: { color: 'default', label: 'В очереди' },
    RUNNING: { color: 'processing', label: 'Выполняется' },
    DONE: { color: 'success', label: 'Готово' },
    FAILED: { color: 'error', label: 'Ошибка' },
  };
  const cfg = map[status] || { color: 'default', label: status };
  return <Tag color={cfg.color}>{cfg.label}</Tag>;
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

  // Версии с активным polling сравнения (comparisonId → documentId)
  const pollingRef = useRef<Map<number, ReturnType<typeof setInterval>>>(new Map());

  // Модалка отчёта сравнения
  const [reportVisible, setReportVisible] = useState(false);
  const [reportData, setReportData] = useState<ComparisonReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

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

  // Очистка polling при unmount
  useEffect(() => {
    const map = pollingRef.current;
    return () => { map.forEach(t => clearInterval(t)); };
  }, []);

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
      if (err?.errorFields) return;
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
      const newVersion = await documentService.uploadVersion(uploadTargetDoc.id, formData);
      message.success('Новая версия загружена');
      setUploadVisible(false);
      setUploadTargetDoc(null);
      loadDocuments();

      // Если запустилось сравнение — начать polling
      if (newVersion.comparisonId && newVersion.comparisonStatus && newVersion.comparisonStatus !== 'DONE' && newVersion.comparisonStatus !== 'FAILED') {
        startComparisonPolling(uploadTargetDoc.id, newVersion.comparisonId);
        message.info('Сравнение версий запущено, статус обновится автоматически');
      }
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error('Ошибка при загрузке версии');
    } finally {
      setUploadLoading(false);
    }
  };

  const startComparisonPolling = (documentId: number, comparisonId: number) => {
    if (pollingRef.current.has(comparisonId)) return;
    const timer = setInterval(async () => {
      try {
        const data = await documentService.getComparison(documentId, comparisonId);
        if (data.status === 'DONE' || data.status === 'FAILED') {
          clearInterval(timer);
          pollingRef.current.delete(comparisonId);
          if (data.status === 'DONE') {
            message.success('Сравнение версий завершено');
          } else {
            message.warning('Сравнение версий завершилось с ошибкой');
          }
          // Обновить список версий если модалка открыта
          if (versionsVisible && versionsDoc?.id === documentId) {
            const updated = await documentService.listVersions(documentId);
            setVersions(updated);
          }
        }
      } catch {
        clearInterval(timer);
        pollingRef.current.delete(comparisonId);
      }
    }, 3000);
    pollingRef.current.set(comparisonId, timer);
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

  const refreshVersionComparisons = async () => {
    if (!versionsDoc) return;
    setVersionsLoading(true);
    try {
      const data = await documentService.listVersions(versionsDoc.id);
      setVersions(data);
    } catch {
      message.error('Не удалось обновить историю версий');
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

  // --- Просмотр отчёта ---
  const openReport = async (documentId: number, comparisonId: number) => {
    setReportVisible(true);
    setReportLoading(true);
    try {
      const data = await documentService.getComparison(documentId, comparisonId);
      setReportData(data);
    } catch {
      message.error('Не удалось загрузить отчёт');
      setReportVisible(false);
    } finally {
      setReportLoading(false);
    }
  };

  const openVersionComparison = async (documentId: number, versionId: number) => {
    setReportVisible(true);
    setReportLoading(true);
    try {
      const data = await documentService.getVersionComparison(documentId, versionId);
      if (!data) {
        message.info('Отчёт сравнения для этой версии не найден');
        setReportVisible(false);
      } else {
        setReportData(data);
      }
    } catch {
      message.error('Не удалось загрузить отчёт');
      setReportVisible(false);
    } finally {
      setReportLoading(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!reportData || !versionsDoc) return;
    try {
      const blob = await documentService.downloadComparisonReport(versionsDoc.id, reportData.id);
      triggerDownload(blob, `comparison_${reportData.id}.txt`);
    } catch {
      message.error('Ошибка при скачивании отчёта');
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
      title: 'Сравнение',
      key: 'comparison',
      width: 160,
      render: (_: unknown, record: DocumentVersion) => {
        if (!versionsDoc) return null;
        if (!record.comparisonId && !record.comparisonStatus) {
          // Попробуем загрузить сравнение по версии
          return (
            <Tooltip title="Загрузить отчёт сравнения">
              <Button
                icon={<DiffOutlined />}
                size="small"
                onClick={() => openVersionComparison(versionsDoc.id, record.id)}
              />
            </Tooltip>
          );
        }
        return (
          <Space size={4}>
            {comparisonStatusTag(record.comparisonStatus)}
            {record.comparisonStatus === 'DONE' && record.comparisonId && (
              <Tooltip title="Просмотр отчёта">
                <Button
                  icon={<DiffOutlined />}
                  size="small"
                  onClick={() => openReport(versionsDoc.id, record.comparisonId!)}
                />
              </Tooltip>
            )}
            {(record.comparisonStatus === 'PENDING' || record.comparisonStatus === 'RUNNING') && record.comparisonId && (
              <Tooltip title="Обновить статус">
                <Button
                  icon={<ReloadOutlined spin={record.comparisonStatus === 'RUNNING'} />}
                  size="small"
                  onClick={() => {
                    if (record.comparisonId) {
                      startComparisonPolling(versionsDoc.id, record.comparisonId);
                      refreshVersionComparisons();
                    }
                  }}
                />
              </Tooltip>
            )}
          </Space>
        );
      },
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
        title={
          <Space>
            <span>История версий: {versionsDoc?.name}</span>
            <Button icon={<ReloadOutlined />} size="small" onClick={refreshVersionComparisons} />
          </Space>
        }
        open={versionsVisible}
        onCancel={() => setVersionsVisible(false)}
        footer={null}
        width={920}
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

      {/* Модалка отчёта сравнения */}
      <Modal
        title={
          reportData
            ? `Сравнение: v${reportData.baseVersion?.versionNumber} → v${reportData.targetVersion?.versionNumber}`
            : 'Отчёт сравнения'
        }
        open={reportVisible}
        onCancel={() => { setReportVisible(false); setReportData(null); }}
        footer={
          reportData?.status === 'DONE' ? (
            <Button icon={<DownloadOutlined />} onClick={handleDownloadReport}>
              Скачать .txt
            </Button>
          ) : null
        }
        width={800}
      >
        {reportLoading && <Spin style={{ display: 'block', textAlign: 'center', padding: 32 }} />}
        {!reportLoading && reportData && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Space>
              <Text type="secondary">Статус:</Text>
              {comparisonStatusTag(reportData.status)}
              {reportData.finishedAt && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {new Date(reportData.finishedAt).toLocaleString('ru-RU')}
                </Text>
              )}
            </Space>

            {reportData.warnings && reportData.warnings.length > 0 && (
              <Alert
                type="warning"
                icon={<WarningOutlined />}
                showIcon
                message="Предупреждения"
                description={
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {reportData.warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                }
              />
            )}

            {reportData.status === 'DONE' && reportData.reportJson && (
              <Alert
                type="info"
                message={`Изменено листов: ${reportData.reportJson.changedPages ?? '?'} из ${reportData.reportJson.pageCount ?? '?'}`}
              />
            )}

            {reportData.status === 'DONE' && reportData.reportText && (
              <pre style={{
                background: '#f6f8fa',
                border: '1px solid #d0d7de',
                borderRadius: 6,
                padding: 12,
                fontSize: 12,
                maxHeight: 400,
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {reportData.reportText}
              </pre>
            )}

            {(reportData.status === 'PENDING' || reportData.status === 'RUNNING') && (
              <Alert type="info" message="Сравнение ещё выполняется. Попробуйте открыть позже." />
            )}

            {reportData.status === 'FAILED' && (
              <Alert type="error" message="Сравнение завершилось с ошибкой." />
            )}
          </Space>
        )}
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
