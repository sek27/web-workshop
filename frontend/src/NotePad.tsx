import { useEffect, useRef, useState } from "react";
import { Button, Input, message } from "antd";
import axios from "axios";
import * as graphql from "./graphql";
import { Card, Container, Text } from "./Components";

const { TextArea } = Input;

interface NotePadProps {
  room: graphql.GetJoinedRoomsQuery["user_room"][0]["room"] | undefined;
  handleClose: () => void;
}

const NotePad: React.FC<NotePadProps> = ({ room, handleClose }) => {
  const [content, setContent] = useState<string>("");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [dirty, setDirty] = useState<boolean>(false);
  // 自动保存防抖计时器
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 避免“读取返回的内容”被误当作未保存修改
  const loadedRef = useRef<boolean>(false);

  // 首次加载：读取当前用户在该会议下的便签
  useEffect(() => {
    if (!room) return;
    (async () => {
      try {
        const res = await axios.get("/note", { params: { room: room.uuid } });
        setContent(res.data?.content ?? "");
        setSavedAt(res.data?.updated_at ?? null);
        loadedRef.current = true;
      } catch (err) {
        console.error(err);
        message.error("读取便签失败！");
      }
    })();
  }, [room]);

  const save = async (text: string) => {
    if (!room) return;
    setSaving(true);
    try {
      const res = await axios.post("/note", { room: room.uuid, content: text });
      setSavedAt(res.data?.updated_at ?? null);
      setDirty(false);
    } catch (err) {
      console.error(err);
      message.error("保存便签失败！");
    }
    setSaving(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setContent(text);
    if (!loadedRef.current) return;
    setDirty(true);
    // 停止输入 1s 后自动保存
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => save(text), 1000);
  };

  const handleBlur = () => {
    // 失焦时若还有未保存内容，立即保存
    if (timerRef.current) clearTimeout(timerRef.current);
    if (dirty) save(content);
  };

  const Close = () => (
    <Button
      type="link"
      style={{
        width: "40px",
        height: "40px",
        fontSize: "12px",
        position: "absolute",
        right: 0,
        top: 0,
      }}
      className="need-interaction"
      onClick={handleClose}
    >
      ❌
    </Button>
  );

  if (!room) return null;
  return (
    <Card style={{ width: "300px", height: "fit-content" }}>
      <Close />
      <Container style={{ margin: "6px" }}>
        <Text>
          <strong>{room.name} · 便签纸</strong>
        </Text>
        <br />
        <Text size="small">
          {saving
            ? "保存中…"
            : savedAt
            ? `已保存 ${new Date(savedAt).toLocaleString("zh-CN")}`
            : "仅自己可见"}
        </Text>
      </Container>
      <div className="need-interaction" style={{ margin: "6px" }}>
        <TextArea
          placeholder="写点只有你能看到的备忘…"
          value={content}
          onChange={handleChange}
          onBlur={handleBlur}
          autoSize={{ minRows: 8, maxRows: 16 }}
          style={{ fontSize: "16px" }}
        />
      </div>
    </Card>
  );
};

export default NotePad;
