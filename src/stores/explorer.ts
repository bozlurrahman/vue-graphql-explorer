// stores/explorer.ts
import type { GraphQLField, GraphQLNamedType } from 'graphql';
import {
  isEnumType,
  isInputObjectType,
  isInterfaceType,
  isNamedType,
  isObjectType,
  isScalarType,
  isUnionType,
} from 'graphql';
import { defineExplorerStore, type ExplorerStore } from './registry';
import { shallowRef, watch } from 'vue-demi';
import type { ExplorerNavStack, ExplorerNavStackItem } from '../lib/explorer';
import { useSchemaStore } from './schema';

const initialNavStackItem: ExplorerNavStackItem = { name: 'Explorer' };

function explorerStoreSetup() {
  const explorerNavStack = shallowRef<ExplorerNavStack>([initialNavStackItem]);

  const schemaStore = useSchemaStore();

  watch(
    () => [schemaStore.schema, schemaStore.validationErrors],
    () => {
      const schema = schemaStore.schema;
      const validationErrors = schemaStore.validationErrors;
      if (schema == null || validationErrors.length > 0) {
        reset();
      } else {
        const oldNavStack = explorerNavStack.value;
        if (oldNavStack.length === 1) {
          return;
        }
        const newNavStack: ExplorerNavStack = [initialNavStackItem];
        let lastEntity: GraphQLNamedType | GraphQLField<any, any, any> | null = null;
        for (const item of oldNavStack) {
          if (item === initialNavStackItem) {
            continue;
          }
          if (item.def) {
            if (isNamedType(item.def)) {
              const newType = schema.getType(item.def.name);
              if (newType) {
                newNavStack.push({
                  name: item.name,
                  def: newType,
                });
                lastEntity = newType;
              } else {
                break;
              }
            } else if (lastEntity === null) {
              break;
            } else if (isObjectType(lastEntity) || isInputObjectType(lastEntity)) {
              const field = lastEntity.getFields()[item.name];
              if (field) {
                newNavStack.push({
                  name: item.name,
                  def: field,
                });
              } else {
                break;
              }
            } else if (
              isScalarType(lastEntity) ||
              isEnumType(lastEntity) ||
              isInterfaceType(lastEntity) ||
              isUnionType(lastEntity)
            ) {
              break;
            } else {
              const field: GraphQLField<any, any> = lastEntity;
              const arg = field.args.find(a => a.name === item.name);
              if (arg) {
                newNavStack.push({
                  name: item.name,
                  def: field,
                });
              } else {
                break;
              }
            }
          } else {
            lastEntity = null;
            newNavStack.push(item);
          }
        }
        explorerNavStack.value = newNavStack;
      }
    },
  );

  function push(item: ExplorerNavStackItem) {
    const currentState = explorerNavStack.value;
    const lastItem = currentState[currentState.length - 1];
    if (lastItem && lastItem.def === item.def) {
      return;
    }
    explorerNavStack.value = [...currentState, item] as ExplorerNavStack;
  }

  function pop() {
    if (explorerNavStack.value.length > 1) {
      explorerNavStack.value = explorerNavStack.value.slice(0, -1) as ExplorerNavStack;
    }
  }

  function reset() {
    explorerNavStack.value = [initialNavStackItem];
  }

  return { explorerNavStack, push, pop, reset };
}

export const useExplorerStore: () => ExplorerStore<ReturnType<typeof explorerStoreSetup>> = defineExplorerStore(
  'explorer',
  explorerStoreSetup,
);
