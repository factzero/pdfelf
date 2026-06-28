/**
 * 导航栏「所有工具」下拉菜单数据
 * 按分类组织所有 PDF 工具的链接，图标与首页保持一致
 */
import type { Component } from 'vue'
import {
  FolderArchive, Combine, Scissors, RotateCw, Trash2, Copy, ArrowLeftRight,
  Stamp, Hash, BookOpenText,
  Lock, LockOpen, Crop, Image, Wrench,
  FileText, Table2, Presentation, FileImage, Maximize, FileType, Globe,
  FileCode, FlipVertical, Palette, PenTool, EyeOff,
} from 'lucide-vue-next'

export interface NavToolItem {
  titleKey: string
  route: string
  icon: Component
}

export interface NavDropdownCategory {
  categoryKey: string
  tools: NavToolItem[]
}

export const navDropdownCategories: NavDropdownCategory[] = [
  {
    categoryKey: 'categories.organize',
    tools: [
      { icon: FolderArchive,  titleKey: 'tools.compressPdf.title',    route: '/compress-pdf' },
      { icon: Combine,       titleKey: 'tools.mergePdf.title',       route: '/merge-pdf' },
      { icon: Scissors,      titleKey: 'tools.splitPdf.title',       route: '/split-pdf' },
      { icon: RotateCw,      titleKey: 'tools.rotatePdf.title',      route: '/rotate-pdf' },
      { icon: Trash2,        titleKey: 'tools.deletePages.title',   route: '/delete-pages' },
      { icon: Copy,          titleKey: 'tools.extractPages.title',  route: '/extract-pages' },
      { icon: ArrowLeftRight,titleKey: 'tools.reorderPages.title',  route: '/reorder-pages' },
    ],
  },
  {
    categoryKey: 'categories.edit',
    tools: [
      { icon: Stamp,        titleKey: 'tools.addWatermark.title',    route: '/add-watermark' },
      { icon: Hash,         titleKey: 'tools.addPageNumbers.title', route: '/add-page-numbers' },
      { icon: BookOpenText, titleKey: 'tools.headerFooter.title',   route: '/add-header-footer' },
    ],
  },
  {
    categoryKey: 'categories.security',
    tools: [
      { icon: Lock,   titleKey: 'tools.protectPdf.title',    route: '/protect-pdf' },
      { icon: LockOpen, titleKey: 'tools.unlockPdf.title',     route: '/unlock-pdf' },
      { icon: Crop,   titleKey: 'tools.cropPdf.title',       route: '/crop-pdf' },
      { icon: Image,  titleKey: 'tools.extractImages.title', route: '/extract-images' },
      { icon: Wrench, titleKey: 'tools.repairPdf.title',     route: '/repair-pdf' },
    ],
  },
  {
    categoryKey: 'categories.fromPdf',
    tools: [
      { icon: FileText,     titleKey: 'tools.pdfToWord.title',  route: '/pdf-to-word' },
      { icon: Table2,       titleKey: 'tools.pdfToExcel.title', route: '/pdf-to-excel' },
      { icon: Presentation, titleKey: 'tools.pdfToPpt.title',   route: '/pdf-to-ppt' },
      { icon: Image,        titleKey: 'tools.pdfToImage.title', route: '/pdf-to-image' },
      { icon: FileImage,    titleKey: 'tools.pdfToJpg.title',   route: '/pdf-to-jpg' },
      { icon: FileImage,    titleKey: 'tools.pdfToPng.title',   route: '/pdf-to-png' },
      { icon: FileImage,    titleKey: 'tools.pdfToTiff.title',  route: '/pdf-to-tiff' },
      { icon: Maximize,     titleKey: 'tools.pdfToSvg.title',   route: '/pdf-to-svg' },
      { icon: FileType,     titleKey: 'tools.pdfToText.title',  route: '/pdf-to-text' },
      { icon: Globe,        titleKey: 'tools.pdfToHtml.title',  route: '/pdf-to-html' },
    ],
  },
  {
    categoryKey: 'categories.toPdf',
    tools: [
      { icon: FileText,     titleKey: 'tools.wordToPdf.title',  route: '/word-to-pdf' },
      { icon: Table2,       titleKey: 'tools.excelToPdf.title', route: '/excel-to-pdf' },
      { icon: Presentation, titleKey: 'tools.pptToPdf.title',   route: '/ppt-to-pdf' },
      { icon: Image,        titleKey: 'tools.imageToPdf.title', route: '/image-to-pdf' },
      { icon: Globe,        titleKey: 'tools.htmlToPdf.title',  route: '/html-to-pdf' },
    ],
  },
  {
    categoryKey: 'categories.reader',
    tools: [
      { icon: BookOpenText, titleKey: 'tools.pdfReader.title',  route: '/pdf-reader' },
    ],
  },
  {
    categoryKey: 'categories.moreTools',
    tools: [
      { icon: FileCode,     titleKey: 'tools.editMetadata.title',  route: '/edit-metadata' },
      { icon: FlipVertical, titleKey: 'tools.flipPdf.title',       route: '/flip-pdf' },
      { icon: Palette,      titleKey: 'tools.grayscalePdf.title',  route: '/grayscale-pdf' },
      { icon: Maximize,     titleKey: 'tools.resizePdf.title',     route: '/resize-pdf' },
      { icon: PenTool,      titleKey: 'tools.signPdf.title',       route: '/sign-pdf' },
      { icon: EyeOff,       titleKey: 'tools.redactPdf.title',     route: '/redact-pdf' },
      { icon: FileType,     titleKey: 'tools.fillForm.title',      route: '/fill-form' },
    ],
  },
]
