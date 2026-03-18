import { GcdsLink } from '@gcds-core/components-react';
import { CenteredPageLayout } from "../components/layout";
import type { FunctionComponent } from "../common/types";

// Components (internal)
import { DateModified, Heading, Text } from '../components';

const NotFound = (): FunctionComponent => {
  return (
  <CenteredPageLayout>
      <Heading tag="h1">Page could not be found</Heading>
      <Text>Check you've entered the correct web address or <GcdsLink href="/">go back to the homepage</GcdsLink>.</Text>

      <DateModified>2025-07-16</DateModified>
  </CenteredPageLayout>
  );
};

export default NotFound;