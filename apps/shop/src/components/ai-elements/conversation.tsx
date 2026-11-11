import { cn } from "@/lib/utils";
import { ArrowDownIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";
import { strings } from "@/lib/strings";

export type ConversationProps = ComponentProps<typeof StickToBottom>;

// Sticks to the bottom while the answer streams, until the user scrolls up.
export const Conversation = ({ className, ...props }: ConversationProps) => (
  <StickToBottom
    className={cn("relative flex flex-1 flex-col overflow-y-hidden", className)}
    initial="instant"
    resize="smooth"
    role="log"
    {...props}
  />
);

export type ConversationContentProps = ComponentProps<
  typeof StickToBottom.Content
>;

export const ConversationContent = ({
  className,
  ...props
}: ConversationContentProps) => (
  <StickToBottom.Content
    className={cn("flex flex-col gap-8 p-4", className)}
    {...props}
  />
);

export const ConversationScrollButton = ({
  className,
}: {
  className?: string;
}) => {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();
  if (isAtBottom) return null;
  // A strip under the list, in the flow: the button never covers content.
  return (
    <div className="grid h-12 shrink-0 place-items-center">
      <button
        type="button"
        aria-label={strings.scrollBottom}
        onClick={() => scrollToBottom()}
        className={cn(
          "animate-in fade-in zoom-in-95 duration-150 ease-out glass grid size-10 place-items-center rounded-full text-fg shadow-none",
          className
        )}
      >
        <ArrowDownIcon className="size-[18px]" aria-hidden />
      </button>
    </div>
  );
};
