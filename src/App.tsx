import React, { useState } from "react";
import {
  Layout,
  Card,
  Input,
  Button,
  Table,
  Typography,
  Row,
  Col,
  message,
  Empty,
} from "antd";
import {
  DownloadOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  DeleteOutlined,
  BuildOutlined,
  CodeOutlined,
} from "@ant-design/icons";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;

// --- Types ---
interface ColumnConfig {
  id: string;
  label: string;
  selector: string;
}

interface ScrapedData {
  [key: string]: string;
}

const DynamicScraper: React.FC = () => {
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [containerSelector, setContainerSelector] = useState(
    "div.rounded-4.border.bg-white.shadow-sm.mb-3.pb-4",
  );
  const [data, setData] = useState<ScrapedData[]>([]);

  // --- CRUD State for Columns ---
  const [columnConfigs, setColumnConfigs] = useState<ColumnConfig[]>([
    { id: "1", label: "Company", selector: "h2.fs-5.pb-0.text-capitalize" },
    { id: "2", label: "Email", selector: "i.fa-envelope + a" },
    { id: "3", label: "Phone", selector: "i.fa-phone + span > a" },
    { id: "4", label: "Website", selector: "i.fa-globe + a" },
  ]);

  // --- Column CRUD Actions ---
  const addColumn = () => {
    const newCol: ColumnConfig = {
      id: Date.now().toString(),
      label: "New Column",
      selector: "",
    };
    setColumnConfigs([...columnConfigs, newCol]);
  };

  const removeColumn = (id: string) => {
    setColumnConfigs(columnConfigs.filter((col) => col.id !== id));
  };

  const updateColumn = (
    id: string,
    field: keyof ColumnConfig,
    value: string,
  ) => {
    setColumnConfigs(
      columnConfigs.map((col) =>
        col.id === id ? { ...col, [field]: value } : col,
      ),
    );
  };

  // Helper to clean the visible text content
  const cleanTextContent = (text: string): string => {
    if (!text) return "N/A";

    return text
      .replace(/^mailto:/i, "") // Strip mailto: if it appears in text
      .replace(/^tel:/i, "") // Strip tel: if it appears in text
      .replace(/^https?:\/\/(www\.)?/i, "") // Strip URL prefixes
      .trim(); // Remove surrounding whitespace
  };

  const runExtraction = () => {
    if (!htmlContent.trim())
      return message.error("Please paste HTML content first.");

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, "text/html");
      const containers = doc.querySelectorAll(containerSelector);

      if (containers.length === 0)
        return message.error("Container selector found 0 items.");

      const results: ScrapedData[] = Array.from(containers).map((el, idx) => {
        const row: ScrapedData = { key: idx.toString() };

        columnConfigs.forEach((col) => {
          const target = el.querySelector(col.selector);

          if (target) {
            // DIRECTIVE: Grab textContent (what the user sees), not the href attribute
            const rawText = target.textContent || "N/A";
            row[col.label] = cleanTextContent(rawText);
          } else {
            row[col.label] = "N/A";
          }
        });
        return row;
      });

      setData(results);
      message.success(`Extracted ${results.length} rows using visible text.`);
    } catch (e) {
      message.error("Extraction failed. Check the console.");
      console.error(e);
    }
  };

  // --- Export ---
  const exportXLSX = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Scraped Data");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buf]), `data_${Date.now()}.xlsx`);
  };

  // --- Dynamic Table Columns ---
  const tableColumns = columnConfigs.map((col) => ({
    title: col.label,
    dataIndex: col.label,
    key: col.id,
    render: (text: string) =>
      text?.startsWith("http") ? (
        <a href={text} target="_blank" rel="noreferrer">
          Link
        </a>
      ) : (
        text
      ),
  }));

  return (
    <Layout style={{ minHeight: "100vh", background: "#f0f2f5" }}>
      <Header
        style={{ background: "#001529", display: "flex", alignItems: "center" }}
      >
        <Title level={4} style={{ color: "white", margin: 0 }}>
          HTML Scraper & XLSX Exporter
        </Title>
      </Header>

      <Content style={{ padding: "24px" }}>
        <Row gutter={[24, 24]}>
          {/* Left: Configuration & Input */}
          <Col xs={24} lg={10}>
            <Card
              title={
                <span>
                  <CodeOutlined /> 1. Paste HTML
                </span>
              }
              bordered={false}
            >
              <TextArea
                rows={6}
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                placeholder="Paste the page HTML here..."
              />
              <div style={{ marginTop: 16 }}>
                <Text strong>Container Selector:</Text>
                <Input
                  value={containerSelector}
                  onChange={(e) => setContainerSelector(e.target.value)}
                />
              </div>
            </Card>

            <Card
              title={
                <span>
                  <BuildOutlined /> 2. Manage Columns (CRUD)
                </span>
              }
              style={{ marginTop: 20 }}
              bordered={false}
              extra={
                <Button
                  type="dashed"
                  onClick={addColumn}
                  icon={<PlusOutlined />}
                >
                  Add Column
                </Button>
              }
            >
              {columnConfigs.map((col) => (
                <div
                  key={col.id}
                  style={{
                    marginBottom: 16,
                    padding: 12,
                    border: "1px solid #f0f0f0",
                    borderRadius: 8,
                  }}
                >
                  <Row gutter={8} align="middle">
                    <Col span={10}>
                      <Input
                        placeholder="Label (e.g. Email)"
                        value={col.label}
                        onChange={(e) =>
                          updateColumn(col.id, "label", e.target.value)
                        }
                      />
                    </Col>
                    <Col span={10}>
                      <Input
                        placeholder="CSS Selector"
                        value={col.selector}
                        onChange={(e) =>
                          updateColumn(col.id, "selector", e.target.value)
                        }
                      />
                    </Col>
                    <Col span={4}>
                      <Button
                        danger
                        type="text"
                        icon={<DeleteOutlined />}
                        onClick={() => removeColumn(col.id)}
                      />
                    </Col>
                  </Row>
                </div>
              ))}
              <Button
                type="primary"
                block
                size="large"
                icon={<PlayCircleOutlined />}
                onClick={runExtraction}
              >
                Run Scraper
              </Button>
            </Card>
          </Col>

          {/* Right: Results Preview */}
          <Col xs={24} lg={14}>
            <Card
              title={<span>Results Preview</span>}
              bordered={false}
              extra={
                <Button
                  type="primary"
                  disabled={!data.length}
                  icon={<DownloadOutlined />}
                  onClick={exportXLSX}
                >
                  Export XLSX
                </Button>
              }
            >
              {data.length > 0 ? (
                <Table
                  dataSource={data}
                  columns={tableColumns}
                  size="small"
                  pagination={{ pageSize: 10 }}
                  scroll={{ x: "max-content" }}
                />
              ) : (
                <Empty description="No data extracted yet" />
              )}
            </Card>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
};

export default DynamicScraper;
