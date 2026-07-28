import { useWindowDimensions } from "react-native";
import RenderHtml from "react-native-render-html";
import { toHtmlSource } from "../util/renderBlogContent";

// Shared HTML-or-legacy-plain-text renderer for blog post content, used by
// both the list preview and the detail screen.
export function BlogContent({ content, baseStyle }) {
  const { width } = useWindowDimensions();

  return (
    <RenderHtml
      contentWidth={width}
      source={{ html: toHtmlSource(content) }}
      baseStyle={baseStyle}
    />
  );
}
