"use client";

import { ImagePlus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef } from "react";

import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from "@/components/ui/attachment";

export type WizardLocalRef = {
  key: string;
  role: "person" | "location";
  file: File;
  url: string;
};

type WizardRefsProps = {
  outputKind: string;
  refs: WizardLocalRef[];
  onAdd: (role: "person" | "location", file: File) => void;
  onRemove: (key: string) => void;
};

export function WizardRefs({ outputKind, refs, onAdd, onRemove }: WizardRefsProps) {
  const lab = useTranslations("backoffice");
  const locationRef = useRef<HTMLInputElement>(null);
  const peopleRef = useRef<HTMLInputElement>(null);
  const location = refs.find((item) => item.role === "location");
  const people = refs.filter((item) => item.role === "person");
  const canAddLocation = !location;
  const canAddPerson = people.length < 3;
  const subjectTitle =
    outputKind === "avatar"
      ? lab("refPeopleAvatar")
      : outputKind === "product"
        ? lab("refProducts")
        : lab("refPeople");
  const subjectHint =
    outputKind === "avatar"
      ? lab("refPeopleHintAvatar")
      : outputKind === "product"
        ? lab("refProductsHint")
        : lab("refPeopleHint");

  return (
    <div className="space-y-5">
      <input
        ref={locationRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onAdd("location", file);
          }
          event.target.value = "";
        }}
      />
      <input
        ref={peopleRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onAdd("person", file);
          }
          event.target.value = "";
        }}
      />

      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium">{lab("refLocation")}</p>
          <p className="text-sm text-ink/70">{lab("refLocationHint")}</p>
        </div>
        <AttachmentGroup className="gap-3">
          {canAddLocation ? (
            <Attachment state="idle" orientation="vertical" className="w-28">
              <AttachmentMedia>
                <ImagePlus aria-hidden />
              </AttachmentMedia>
              <AttachmentContent>
                <AttachmentTitle>{lab("upload")}</AttachmentTitle>
                <AttachmentDescription>{lab("refLocationOptional")}</AttachmentDescription>
              </AttachmentContent>
              <AttachmentTrigger
                aria-label={lab("refLocation")}
                className="min-h-11"
                onClick={() => locationRef.current?.click()}
              />
            </Attachment>
          ) : null}
          {location ? (
            <Attachment state="done" orientation="vertical">
              <AttachmentMedia variant="image">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={location.url} alt="" />
              </AttachmentMedia>
              <AttachmentContent>
                <AttachmentTitle>{lab("refLocation")}</AttachmentTitle>
              </AttachmentContent>
              <AttachmentActions>
                <AttachmentAction aria-label={lab("refRemoveLocation")} onClick={() => onRemove(location.key)}>
                  <X />
                </AttachmentAction>
              </AttachmentActions>
            </Attachment>
          ) : null}
        </AttachmentGroup>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium">{subjectTitle}</p>
          <p className="text-sm text-ink/70">{subjectHint}</p>
        </div>
        <AttachmentGroup className="gap-3">
          {canAddPerson ? (
            <Attachment state="idle" orientation="vertical" className="w-28">
              <AttachmentMedia>
                <ImagePlus aria-hidden />
              </AttachmentMedia>
              <AttachmentContent>
                <AttachmentTitle>{lab("upload")}</AttachmentTitle>
                <AttachmentDescription>{lab("refPeopleCount", { count: people.length, max: 3 })}</AttachmentDescription>
              </AttachmentContent>
              <AttachmentTrigger
                aria-label={subjectTitle}
                className="min-h-11"
                onClick={() => peopleRef.current?.click()}
              />
            </Attachment>
          ) : null}
          {people.map((item, index) => (
            <Attachment key={item.key} state="done" orientation="vertical">
              <AttachmentMedia variant="image">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt="" />
              </AttachmentMedia>
              <AttachmentContent>
                <AttachmentTitle>
                  {outputKind === "avatar"
                    ? lab("refAvatarPhotoN", { n: index + 1 })
                    : outputKind === "product"
                      ? lab("refAvatarPhotoN", { n: index + 1 })
                      : lab("refPersonN", { n: index + 1 })}
                </AttachmentTitle>
              </AttachmentContent>
              <AttachmentActions>
                <AttachmentAction
                  aria-label={outputKind === "avatar" ? lab("refRemoveAvatarPhoto") : lab("refRemovePerson")}
                  onClick={() => onRemove(item.key)}
                >
                  <X />
                </AttachmentAction>
              </AttachmentActions>
            </Attachment>
          ))}
        </AttachmentGroup>
      </div>
    </div>
  );
}
