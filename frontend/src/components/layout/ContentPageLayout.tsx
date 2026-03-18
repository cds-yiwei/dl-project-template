import type { PropsWithChildren } from "react";
import type { FunctionComponent } from "../../common/types";

type ContentPageLayoutProps = PropsWithChildren<{
	className?: string;
}>;

export const ContentPageLayout = ({ children, className = "" }: ContentPageLayoutProps): FunctionComponent => (
	<section className={`mx-auto flex w-full max-w-4xl flex-col items-center gap-300 py-500 text-center ${className}`.trim()}>{children}</section>
);