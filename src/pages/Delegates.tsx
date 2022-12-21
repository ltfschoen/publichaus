import { useMemo } from 'react';
import { Card, SingleColumnLayout, widthQuery } from '@daohaus/ui';

import { useMembers } from '../hooks/useMembers';
import { useRecords } from '../hooks/useRecord';
import { DelegateOverview } from '../components/DelegateOverview';
import { DELEGATE_TABLE_REF } from '../legos/tx';
import { isDelegateData } from '../utils/typeguards';
import { RegisteredMembers } from '../utils/types';
import styled from 'styled-components';
import { DelegateTable } from '../components/DelegateTable';
import { TARGET_DAO } from '../targetDAO';
import { StatusDisplay } from '../components/StatusDisplay';

export const Delegates = () => {
  const {
    isIdle: isRecordsIdle,
    isLoading: isLoadingRecords,
    records,
    error: recordsError,
  } = useRecords({
    daoId: TARGET_DAO.ADDRESS,
    chainId: TARGET_DAO.CHAIN_ID,
    recordType: 'credential',
    credentialType: DELEGATE_TABLE_REF,
  });

  const {
    isIdle: isMembersIdle,
    isLoading: isLoadingMembers,
    members,
    error: membersError,
  } = useMembers({
    daoId: TARGET_DAO.ADDRESS,
    chainId: TARGET_DAO.CHAIN_ID,
  });

  const isLoadingAny =
    isLoadingMembers || isLoadingRecords || isRecordsIdle || isMembersIdle;
  const isErrorAny = recordsError || membersError;

  const registeredDelegates = useMemo(() => {
    if (!records?.length || !members?.length) return {};
    return records.reduce((acc, record) => {
      // If the record is not valid, skip it

      const { parsedContent, createdAt } = record;
      if (!isDelegateData(parsedContent)) {
        console.warn('Delegate data is not valid', parsedContent);
        return acc;
      }
      const delegateAddress = parsedContent.recipientAddress;

      // If the delegate is already in the accumulator, add the record to the array

      if (acc[delegateAddress]) {
        return {
          ...acc,
          [delegateAddress]: {
            ...acc[delegateAddress],
            records: [
              ...acc[delegateAddress].records,
              { ...parsedContent, createdAt },
            ],
          },
        };
      }

      // If the delegate is not in the accumulator, add the delegate and the record

      const delegateMemberData = members.find(
        (member) =>
          member.memberAddress.toLowerCase() === delegateAddress.toLowerCase()
      );

      // If the delegate is not a member of the DAO, skip it

      if (!delegateMemberData) {
        console.warn(
          'Delegate is not a member of the DAO',
          delegateAddress,
          members
        );
        return acc;
      }

      return {
        ...acc,
        [delegateAddress]: {
          ...delegateMemberData,
          records: [{ ...parsedContent, createdAt }],
        },
      };
    }, {} as RegisteredMembers);
  }, [members, records]);

  if (isLoadingAny || !registeredDelegates)
    return <StatusDisplay status="Loading" spinner />;
  if (isErrorAny)
    return (
      <StatusDisplay
        status="Error"
        description={recordsError?.message || membersError?.message}
      />
    );

  return (
    <SingleColumnLayout>
      <DelegateTable registeredDelegates={registeredDelegates} />
    </SingleColumnLayout>
  );
};
