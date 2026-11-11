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
  // Floats just above the docked composer (--composer-h is set by Chat).
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[calc(var(--composer-h,140px)+8px)] z-10 grid place-items-center">
      <button
        type="button"
        aria-label={strings.scrollBottom}
        onClick={() => scrollToBottom()}
        className={cn(
          "pointer-events-auto animate-in fade-in zoom-in-95 duration-150 ease-out glass grid size-10 place-items-center rounded-full text-fg shadow-none",
          className
        )}
      >
        <ArrowDownIcon className="size-[18px]" aria-hidden />
      </button>
    </div>
  );
};
